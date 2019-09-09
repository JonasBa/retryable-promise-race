"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anyPromise_1 = __importDefault(require("./anyPromise"));
const DEFAULT_RETRY_OPTIONS = {
    retryCount: 4,
    retryStatuses: [408, 504],
    timeout: 500
};
const RetryStrategy = (createPromise, options = DEFAULT_RETRY_OPTIONS) => {
    const timeout = options.timeout || DEFAULT_RETRY_OPTIONS.timeout;
    const retryCount = options.retryCount || DEFAULT_RETRY_OPTIONS.retryCount;
    const retryStatuses = options.retryStatuses || DEFAULT_RETRY_OPTIONS.retryStatuses;
    const retry = (retryQueue) => {
        const currentRetryCount = retryQueue.length + 1;
        console.log(currentRetryCount, retryCount);
        if (currentRetryCount > retryCount) {
            console.log("Exceeded timeouts, return a race of what is left");
            return anyPromise_1.default(retryQueue);
        }
        return new Promise((resolve, reject) => {
            const promise = createPromise({ timeout, retryCount, retryStatuses });
            retryQueue.push(promise);
            const delay = currentRetryCount * timeout;
            console.log("New timeout is", delay);
            const timeoutID = setTimeout(() => {
                console.log("Retry because of timeout");
                resolve(retry(retryQueue));
            }, delay);
            promise.catch(error => {
                console.log("Caught in promise.catch", error.message, "checking if we can retry");
                clearTimeout(timeoutID);
                console.log("Cleared timeout");
                if (retryStatuses.includes(error.status)) {
                    console.log("Retry because of error", error.status);
                    return resolve(retry(retryQueue));
                }
                console.log("Not retryable, rejecting");
                reject(error);
            });
            console.log("Race all promises");
            anyPromise_1.default(retryQueue)
                .then(data => {
                console.log("Race resolved with", data);
                resolve(data);
            })
                .catch(reasons => {
                console.log("Caught in anyRace");
                if (currentRetryCount === retryCount) {
                    console.log("Any has exceeded retries");
                    reject(reasons);
                }
                console.log("Return reasons", reasons);
                return reasons;
            });
        })
            .then(data => {
            console.log("Outside resolved with:", data);
            return data;
        })
            .catch(e => {
            // Normalize to always return array of reasons
            // even if first request fails and is not retryable
            return Array.isArray(e) ? e : [e];
        });
    };
    return retry([]);
};
exports.default = RetryStrategy;
