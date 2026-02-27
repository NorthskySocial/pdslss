import { createSignal } from "solid-js";

export interface StratosEnrollment {
  service: string;
  boundaries: Array<{ value: string }>;
  createdAt: string;
}

// undefined = not yet checked, null = checked and not enrolled
export const [stratosEnrollment, setStratosEnrollment] = createSignal<
  StratosEnrollment | null | undefined
>(undefined);

// enrollment of the DID currently being browsed (not the authenticated user)
export const [targetEnrollment, setTargetEnrollment] = createSignal<
  StratosEnrollment | null | undefined
>(undefined);

export const [stratosActive, setStratosActive] = createSignal(false);
