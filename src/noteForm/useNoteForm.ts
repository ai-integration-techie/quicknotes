/**
 * The "New note" form's behaviour (create-note plan, Frontend): the reducer,
 * the field refs, the one-save-at-a-time guard and the event handlers.
 */
import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import type { Note, NoteRepository } from "../storage";
import {
  formReducer,
  initialFormState,
  type Field,
  type FormState,
  type SaveProblem,
} from "./formState";
import { isComposing, isPlainEnter, isSaveShortcut } from "./keyboard";
import { checkBeforeSave } from "./saveCheck";
import { focusTargetFor, problemFromRejection } from "./saveProblems";
import { useUnsavedTextWarning } from "./useUnsavedTextWarning";

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

export interface NoteFormController {
  readonly state: FormState;
  readonly titleRef: RefObject<HTMLInputElement | null>;
  readonly bodyRef: RefObject<HTMLTextAreaElement | null>;
  onChange(field: Field): (event: ChangeEvent<FieldElement>) => void;
  onKeyDown(field: Field): (event: KeyboardEvent<FieldElement>) => void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}

export interface NoteFormWiring {
  /** False while the note view shows (list-notes plan D2). */
  readonly active: boolean;
  /** Reports the note `create` resolved with (list-notes R14). */
  onSaved(note: Note): void;
  /** A save attempt started (edit-delete-note R35). */
  onAttempt?(): void;
}

export function useNoteForm(
  repository: NoteRepository,
  { active, onSaved, onAttempt }: NoteFormWiring,
): NoteFormController {
  const [state, dispatch] = useReducer(formReducer, initialFormState);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // D4: set synchronously, so two triggers in one tick start one save.
  const savingRef = useRef(false);
  // list-notes D2, R27: the form moves focus only while it is showing.
  const activeRef = useRef(active);
  const onSavedRef = useRef(onSaved);
  const onAttemptRef = useRef(onAttempt);
  useLayoutEffect(() => {
    activeRef.current = active;
    onSavedRef.current = onSaved;
    onAttemptRef.current = onAttempt;
  });

  // R2: focus Title after mount (programmatic, so no-autofocus stays on).
  useEffect(() => {
    if (activeRef.current) titleRef.current?.focus();
  }, []);

  useUnsavedTextWarning(state.title !== "" || state.body !== "");

  function focusField(field: Field | null): void {
    if (!activeRef.current) return; // list-notes R27
    if (field === "title") titleRef.current?.focus();
    if (field === "body") bodyRef.current?.focus();
  }

  /** D3b: commit the problem first, so ARIA is in place when focus moves. */
  function show(problem: SaveProblem): void {
    flushSync(() => dispatch({ type: "problem", problem }));
    focusField(focusTargetFor(problem));
  }

  async function attemptSave(): Promise<void> {
    if (savingRef.current) return; // R10
    // R22, D3a: clear every message in its own commit before the outcome.
    flushSync(() => dispatch({ type: "attemptStarted" }));
    onAttemptRef.current?.(); // edit-delete-note R35
    // R5, R9: the fields' current values, unchanged, as exactly two keys.
    const input = {
      title: titleRef.current?.value ?? "",
      body: bodyRef.current?.value ?? "",
    };
    const early = checkBeforeSave(input); // R8
    if (early) {
      show(early);
      return;
    }
    savingRef.current = true;
    flushSync(() => dispatch({ type: "savingStarted" }));
    try {
      const note = await repository.create(input);
      flushSync(() => {
        dispatch({ type: "saved" });
        onSavedRef.current(note); // list-notes R14
      });
      focusField("title"); // R11; not while a note is open (list-notes R27)
    } catch (error) {
      show(problemFromRejection(error)); // R18, R20, R21, D7
    } finally {
      savingRef.current = false;
    }
  }

  function onChange(field: Field) {
    return (event: ChangeEvent<FieldElement>) => {
      dispatch({ type: "edit", field, value: event.target.value });
    };
  }

  function onKeyDown(field: Field) {
    return (event: KeyboardEvent<FieldElement>) => {
      const key = {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        isComposing: event.nativeEvent.isComposing,
        keyCode: event.keyCode,
      };
      if (isComposing(key)) return;
      if (isSaveShortcut(key)) {
        event.preventDefault(); // no line break in Note (R7)
        void attemptSave();
        return;
      }
      if (field === "title" && isPlainEnter(key)) {
        event.preventDefault(); // no implicit submit (R6, D8)
        bodyRef.current?.focus();
      }
    };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void attemptSave();
  }

  return { state, titleRef, bodyRef, onChange, onKeyDown, onSubmit };
}
