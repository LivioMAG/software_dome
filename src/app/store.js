const initialState = {
  admin: null,
  learner: null,
  learnerPortal: null,
  bookingDraft: {
    course: null,
    startDate: null,
    holidayMode: false,
    availability: null,
    box: null,
    dates: [],
  },
};

let state = structuredClone(initialState);
const listeners = new Set();

export const store = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  },
  updateBooking(patch) {
    state = { ...state, bookingDraft: { ...state.bookingDraft, ...patch } };
    listeners.forEach((listener) => listener(state));
  },
  resetBooking() {
    state = { ...state, bookingDraft: structuredClone(initialState.bookingDraft) };
    listeners.forEach((listener) => listener(state));
  },
  reset() {
    state = structuredClone(initialState);
    listeners.forEach((listener) => listener(state));
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
