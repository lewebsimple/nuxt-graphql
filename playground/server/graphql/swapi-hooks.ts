import { defineRemoteExecutorHooks } from "../../../src/runtime/server/lib/remote-executor";

export default defineRemoteExecutorHooks({
  onRequest(request) {
    request.extensions ||= {};
    request.extensions.headers = {
      "X-Dynamic-Header": "RequestHookActive",
    };
  },
});
