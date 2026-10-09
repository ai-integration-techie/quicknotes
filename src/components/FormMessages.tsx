import { BOTH_EMPTY, NOTE_SAVED } from "../copy";
import type { FormMessage } from "../noteForm/formState";

interface FormMessagesProps {
  readonly message: FormMessage;
}

/**
 * The form's two live regions (create-note R34). Both exist, empty, from
 * the first render and are never hidden; an empty region takes no space.
 */
export default function FormMessages({ message }: FormMessagesProps) {
  const alertText =
    message?.kind === "empty"
      ? BOTH_EMPTY
      : message?.kind === "failure"
        ? message.text
        : null;
  return (
    <>
      <div role="status" className="text-base text-zinc-900 not-empty:mt-3">
        {message?.kind === "saved" ? NOTE_SAVED : null}
      </div>
      <div role="alert" className="text-base text-zinc-900 not-empty:mt-3">
        {alertText}
      </div>
    </>
  );
}
