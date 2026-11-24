import type { Request, Response } from "express";
import { upgradeChirpyRed } from "../db/queries/users.js";
import { UserUnAuthorizedError } from "./errors.js";
import { config } from "../config.js";
import { getAPIKey } from "../auth.js";

// POST /api/polka/webhooks — Polka, the payment provider, tells US that a user
// has paid for Chirpy Red. A webhook is the reverse of a normal request: instead
// of our server asking Polka for news, Polka calls us when something happens.
//
// Two consequences follow from that, and they shape this whole handler:
//
//   1. The caller is a machine, not a logged-in person, so there is no JWT to
//      check. Polka proves it is Polka with a shared secret, the API key.
//      Without that check anyone could POST this URL and hand themselves a paid
//      membership for free.
//   2. Polka reads the STATUS CODE to decide whether we received the webhook.
//      Anything outside 2xx and it retries the request later. That is why an
//      event we do not care about still answers 204 rather than an error — we
//      did receive it, we simply had nothing to do.
export async function handlerWebhook(req: Request, res: Response) {
    type Parameter = {
        event: string;
        data: {
            userId: string;
        };
    };

    // The key is checked FIRST, before the body is even read. An unknown caller
    // learns nothing about which events or user ids we accept.
    let apiKey = getAPIKey(req);
    if (apiKey !== config.api.polkaApiKey) {
        throw new UserUnAuthorizedError("invalid api key");
    }

    const params: Parameter = req.body;

    // Polka will send other event types in future. 204 and nothing else: not an
    // error, because an error would make Polka retry an event we will keep
    // ignoring, forever.
    if (params.event !== "user.upgraded") {
        res.status(204).send();
        return;
    }

    const upgradedUser = await upgradeChirpyRed(params.data.userId);

    // undefined means no row had that id. 404 tells Polka the webhook arrived
    // but named somebody we do not have — a retry would not help, though Polka
    // will retry anyway since 404 is not 2xx.
    if (!upgradedUser) {
        res.status(404).send();
        return;
    }

    // 204 with an empty body, as the assignment requires: there is nothing for
    // Polka to read, only the status code matters to them.
    res.status(204).send();

}