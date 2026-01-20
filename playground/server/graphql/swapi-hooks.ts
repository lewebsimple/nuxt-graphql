import { defineRemoteExecutorHooks } from "../../../src/runtime/server/utils/defineRemoteExecutorHooks";

export default defineRemoteExecutorHooks({
  onRequest(request) {
    request.extensions ||= {};
    request.extensions.headers = {
      "X-Dynamic-Header": "RequestHookActive",
    };
  },
});
