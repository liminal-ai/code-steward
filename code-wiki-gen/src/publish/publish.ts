import { err } from "../types/common.js";
import type {
  EngineResult,
  PublishRequest,
  PublishResult,
} from "../types/index.js";

export const publishDocumentation = async (
  request: PublishRequest,
): Promise<EngineResult<PublishResult>> => {
  return err(
    "PUBLISH_ERROR",
    "publishDocumentation is not implemented yet. Story 4 owns publish workflow implementation.",
    {
      request,
    },
  );
};
