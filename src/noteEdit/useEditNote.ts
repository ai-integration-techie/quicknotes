/**
 * The edit form's behaviour (edit-delete-note R5-R14, plan D4). It mirrors
 * `useNoteForm`'s save sequence and reuses its pure modules, but calls
 * `update`, adds the no-op check (R10) and keeps the text on every outcome
 * other than success.
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
import {
  CHANGES_FAILED,
  CHANGES_FULL,
  CHANGES_NOT_FOUND,
  CHANGES_UNAVAILABLE,
} from "../copy";
import {
  formReducer,
  initialFormState,
  type Field,
  type FormState,
  type SaveProblem,
} from "../noteForm/formState";
import {
  isComposing,
  isPlainEnter,
  isSaveShortcut,
} from "../noteForm/keyboard";
import { checkBeforeSave } from "../noteForm/saveCheck";
import {
  focusTargetFor,
  problemFromRejection,
  type FailureCopy,
} from "../noteForm/saveProblems";
import { useUnsavedTextWarning } from "../noteForm/useUnsavedTextWarning";
import { NoteStorageError, type Note, type NoteRepository } from "../storage";
import { differsFrom, type Baseline } from "./baseline";

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

/** R14: the edit form's failure copy. */
export const EDIT_FAILURE_COPY: FailureCopy = Object.freeze({
  unavailable: CHANGES_UNAVAILABLE,
  quota: CHANGES_FULL,
  generic: CHANGES_FAILED,
  notFound: CHANGES_NOT_FOUND,
});

/** What the loaded view does with each outcome of a save attempt. */
export interface EditOutcomes {
  /** Runs in the same commit as the saving state (R12). */
  onSaveStarted(): void;
  /** R13: `update` resolved with `note`. */
  onSaved(note: Note): void;
  /** R10: the values equal the baseline; nothing was written. */
  onNoChange(): void;
  /** R14, R15: runs in the same commit as the problem. */
  onSaveFailed(notFound: boolean): void;
}

export interface EditNoteController {
  readonly state: FormState;
  readonly dirty: boolean;
  readonly titleRef: RefObject<HTMLInputElement | null>;
  readonly bodyRef: RefObject<HTMLTextAreaElement | null>;
  onChange(field: Field): (event: ChangeEvent<FieldElement>) => void;
  onKeyDown(field: Field): (event: KeyboardEvent<FieldElement>) => void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}

function isNotFound(error: unknown): boolean {
  return error instanceof NoteStorageError && error.kind === "not-found";
}

export function useEditNote(
  repository: NoteRepository,
  noteId: string,
  baseline: Baseline,
  outcomes: EditOutcomes,
): EditNoteController {
  // R5: the fields start as the baseline.
  const [state, dispatch] = useReducer(formReducer, {
    ...initialFormState,
    title: baseline.title,
    body: baseline.body,
  });
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const savingRef = useRef(false); // one save at a time (R12)
  const outcomesRef = useRef(outcomes);
  useLayoutEffect(() => {
    outcomesRef.current = outcomes;
  });

  // R6: focus Title once the form is in the document.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const dirty = differsFrom(baseline, state); // R17
  useUnsavedTextWarning(dirty); // R21: a second, independent listener

  function focusField(field: Field | null): void {
    if (field === "title") titleRef.current?.focus();
    if (field === "body") bodyRef.current?.focus();
  }

  function show(problem: SaveProblem, after?: () => void): void {
    flushSync(() => {
      dispatch({ type: "problem", problem });
      after?.();
    });
    focusField(focusTargetFor(problem));
  }

  async function attemptSave(): Promise<void> {
    if (savingRef.current) return;
    flushSync(() => dispatch({ type: "attemptStarted" })); // R9: clear first
    const input = {
      title: titleRef.current?.value ?? "",
      body: bodyRef.current?.value ?? "",
    };
    const early = checkBeforeSave(input);
    if (early) {
      show(early);
      return;
    }
    if (!differsFrom(baseline, input)) {
      outcomesRef.current.onNoChange(); // R10: no update
      return;
    }
    savingRef.current = true;
    flushSync(() => {
      dispatch({ type: "savingStarted" });
      outcomesRef.current.onSaveStarted();
    });
    try {
      const note = await repository.update(noteId, input); // R11
      savingRef.current = false;
      outcomesRef.current.onSaved(note);
    } catch (error) {
      savingRef.current = false;
      const notFound = isNotFound(error);
      show(problemFromRejection(error, EDIT_FAILURE_COPY), () =>
        outcomesRef.current.onSaveFailed(notFound),
      );
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
        event.preventDefault();
        void attemptSave();
        return;
      }
      if (field === "title" && isPlainEnter(key)) {
        event.preventDefault();
        bodyRef.current?.focus();
      }
    };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void attemptSave();
  }

  return { state, dirty, titleRef, bodyRef, onChange, onKeyDown, onSubmit };
}
