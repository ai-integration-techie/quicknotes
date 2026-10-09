/**
 * The "New note" form state as a pure reducer (create-note plan D3). Every
 * action returns a new object; the input state is never changed.
 */
export type Field = "title" | "body";

/** Per-field too-long errors: the field's actual code-point count. */
export type FieldErrors = Readonly<Partial<Record<Field, number>>>;

export type FormMessage =
  /** Status region; cleared by any edit or save attempt (R13). */
  | { readonly kind: "saved" }
  /** Alert region; cleared once either field has a character (R17). */
  | { readonly kind: "empty" }
  /** Alert region; cleared only by the next save attempt (R22). */
  | { readonly kind: "failure"; readonly text: string }
  | null;

export interface FormState {
  readonly title: string;
  readonly body: string;
  readonly phase: "idle" | "saving";
  readonly fieldErrors: FieldErrors;
  readonly message: FormMessage;
}

/** What a failed attempt shows: field errors and/or one message. */
export interface SaveProblem {
  readonly fieldErrors: FieldErrors;
  readonly message: FormMessage;
}

export type FormAction =
  | { readonly type: "edit"; readonly field: Field; readonly value: string }
  | { readonly type: "attemptStarted" }
  | { readonly type: "savingStarted" }
  | { readonly type: "saved" }
  | { readonly type: "problem"; readonly problem: SaveProblem };

export const initialFormState: FormState = Object.freeze({
  title: "",
  body: "",
  phase: "idle",
  fieldErrors: Object.freeze({}),
  message: null,
});

function withoutField(errors: FieldErrors, field: Field): FieldErrors {
  if (!(field in errors)) return errors;
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => key !== field),
  ) as FieldErrors;
}

function messageAfterEdit(
  message: FormMessage,
  title: string,
  body: string,
): FormMessage {
  if (message?.kind === "saved") return null;
  if (message?.kind === "empty" && (title !== "" || body !== "")) return null;
  return message;
}

/** R13, R14, R17: an edit sets the value and may only remove messages. */
function edit(state: FormState, field: Field, value: string): FormState {
  if (state.phase === "saving") return state;
  const title = field === "title" ? value : state.title;
  const body = field === "body" ? value : state.body;
  return {
    ...state,
    title,
    body,
    fieldErrors: withoutField(state.fieldErrors, field),
    message: messageAfterEdit(state.message, title, body),
  };
}

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "edit":
      return edit(state, action.field, action.value);
    case "attemptStarted":
      return { ...state, fieldErrors: {}, message: null };
    case "savingStarted":
      return { ...state, phase: "saving" };
    case "saved":
      return {
        title: "",
        body: "",
        phase: "idle",
        fieldErrors: {},
        message: { kind: "saved" },
      };
    case "problem":
      return {
        ...state,
        phase: "idle",
        fieldErrors: action.problem.fieldErrors,
        message: action.problem.message,
      };
  }
}
