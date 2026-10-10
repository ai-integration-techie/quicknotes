import { createContext, useContext, type ReactNode } from "react";

/**
 * Where dialogs render, and the app root they make inert while open
 * (edit-delete-note plan D1). `App` provides both elements once mounted.
 */
export interface DialogHost {
  /** The element dialogs are portalled into (a sibling after the app root). */
  readonly host: HTMLElement | null;
  /** The app's root element: inert while a dialog is open (R23). */
  readonly appRoot: HTMLElement | null;
}

const DialogHostContext = createContext<DialogHost>({
  host: null,
  appRoot: null,
});

export function ModalLayer({
  host,
  appRoot,
  children,
}: DialogHost & { readonly children: ReactNode }) {
  return (
    <DialogHostContext value={{ host, appRoot }}>{children}</DialogHostContext>
  );
}

export function useDialogHost(): DialogHost {
  return useContext(DialogHostContext);
}
