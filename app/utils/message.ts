import { nanoid } from "nanoid";
import { RequestMessage } from "../client/api";
import { ModelType } from "../store/config";
import { Props } from "../components/visual-props";

export type ChatMessage = RequestMessage & {
  date: string;
  streaming?: boolean;
  isError?: boolean;
  id: string;
  model?: ModelType;
  animation?: React.ReactNode | null;
};

const emptyAnimation: Props = {
  type: "no_animation",
  data: [],
  maxidx: -1,
  compareidx: -1,
  messageId: "",
  newData: [],
  number: -1,
};

export function createMessage(override: Partial<ChatMessage>): ChatMessage {
  return {
    id: nanoid(),
    date: new Date().toLocaleString(),
    role: "user",
    content: "",
    animation: null,
    ...override,
  };
}
