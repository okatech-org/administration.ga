import { useCallback, useReducer } from "react"
import type { ActiveFace, CardDesign, CardElement, ElementType } from "../lib/card-types"
import { CARD_HEIGHT, CARD_WIDTH, createDefaultElement } from "../lib/card-types"

interface DesignerState {
  name: string
  description: string
  backgroundColor: string
  frontBackgroundImage: string | null
  backBackgroundImage: string | null
  backgroundOpacity: number
  frontElements: CardElement[]
  backElements: CardElement[]
  printDuplex: boolean
  magneticTracks: [string, string, string]
  activeFace: ActiveFace
  selectedElementId: string | null
  version: number
}

type Action =
  | { type: "SET_NAME"; name: string }
  | { type: "SET_DESCRIPTION"; description: string }
  | { type: "SET_BACKGROUND_COLOR"; color: string }
  | { type: "SET_BACKGROUND_IMAGE"; face: ActiveFace; image: string | null }
  | { type: "SET_BACKGROUND_OPACITY"; opacity: number }
  | { type: "SET_ACTIVE_FACE"; face: ActiveFace }
  | { type: "SET_DUPLEX"; duplex: boolean }
  | { type: "ADD_ELEMENT"; element: CardElement }
  | { type: "UPDATE_ELEMENT"; id: string; changes: Partial<CardElement> }
  | { type: "REMOVE_ELEMENT"; id: string }
  | { type: "SELECT_ELEMENT"; id: string | null }
  | { type: "DUPLICATE_ELEMENT"; id: string }
  | { type: "MOVE_LAYER"; id: string; direction: "up" | "down" | "top" | "bottom" }
  | { type: "LOAD_DESIGN"; design: CardDesign }
  | { type: "UNDO" }
  | { type: "REDO" }

interface HistoryState {
  past: DesignerState[]
  present: DesignerState
  future: DesignerState[]
}

const MAX_HISTORY = 30

function getInitialState(): DesignerState {
  return {
    name: "Carte Consulaire",
    description: "",
    backgroundColor: "#ffffff",
    frontBackgroundImage: null,
    backBackgroundImage: null,
    backgroundOpacity: 1,
    frontElements: [],
    backElements: [],
    printDuplex: false,
    magneticTracks: ["", "", ""],
    activeFace: "front",
    selectedElementId: null,
    version: 1,
  }
}

function currentElements(state: DesignerState): CardElement[] {
  return state.activeFace === "front" ? state.frontElements : state.backElements
}

function withElements(state: DesignerState, elements: CardElement[]): DesignerState {
  if (state.activeFace === "front") {
    return { ...state, frontElements: elements }
  }
  return { ...state, backElements: elements }
}

// Actions that don't modify history (selection, face switch)
const NON_HISTORY_ACTIONS = new Set(["SELECT_ELEMENT", "SET_ACTIVE_FACE", "UNDO", "REDO"])

function reduceDesigner(state: DesignerState, action: Action): DesignerState {
  switch (action.type) {
    case "SET_NAME":
      return { ...state, name: action.name }
    case "SET_DESCRIPTION":
      return { ...state, description: action.description }
    case "SET_BACKGROUND_COLOR":
      return { ...state, backgroundColor: action.color }
    case "SET_BACKGROUND_IMAGE": {
      if (action.face === "front") return { ...state, frontBackgroundImage: action.image }
      return { ...state, backBackgroundImage: action.image }
    }
    case "SET_BACKGROUND_OPACITY":
      return { ...state, backgroundOpacity: action.opacity }
    case "SET_ACTIVE_FACE":
      return { ...state, activeFace: action.face, selectedElementId: null }
    case "SET_DUPLEX":
      return { ...state, printDuplex: action.duplex }
    case "ADD_ELEMENT": {
      const els = [...currentElements(state), action.element]
      return withElements({ ...state, selectedElementId: action.element.id }, els)
    }
    case "UPDATE_ELEMENT": {
      const els = currentElements(state).map((el) =>
        el.id === action.id ? { ...el, ...action.changes } : el
      )
      return withElements(state, els)
    }
    case "REMOVE_ELEMENT": {
      const els = currentElements(state).filter((el) => el.id !== action.id)
      return withElements(
        { ...state, selectedElementId: state.selectedElementId === action.id ? null : state.selectedElementId },
        els
      )
    }
    case "SELECT_ELEMENT":
      return { ...state, selectedElementId: action.id }
    case "DUPLICATE_ELEMENT": {
      const original = currentElements(state).find((el) => el.id === action.id)
      if (!original) return state
      const copy = createDefaultElement(original.type)
      Object.assign(copy, { ...original, id: copy.id, x: original.x + 20, y: original.y + 20 })
      const els = [...currentElements(state), copy]
      return withElements({ ...state, selectedElementId: copy.id }, els)
    }
    case "MOVE_LAYER": {
      const els = [...currentElements(state)].sort((a, b) => a.zIndex - b.zIndex)
      const idx = els.findIndex((el) => el.id === action.id)
      if (idx === -1) return state
      let newIdx = idx
      if (action.direction === "up" && idx < els.length - 1) newIdx = idx + 1
      if (action.direction === "down" && idx > 0) newIdx = idx - 1
      if (action.direction === "top") newIdx = els.length - 1
      if (action.direction === "bottom") newIdx = 0
      if (newIdx === idx) return state
      const [item] = els.splice(idx, 1)
      els.splice(newIdx, 0, item)
      const reIndexed = els.map((el, i) => ({ ...el, zIndex: i }))
      return withElements(state, reIndexed)
    }
    case "LOAD_DESIGN":
      return {
        ...getInitialState(),
        name: action.design.name,
        description: action.design.description ?? "",
        backgroundColor: action.design.backgroundColor,
        frontBackgroundImage: action.design.frontBackgroundImage,
        backBackgroundImage: action.design.backBackgroundImage,
        backgroundOpacity: action.design.backgroundOpacity,
        frontElements: action.design.frontElements,
        backElements: action.design.backElements,
        printDuplex: action.design.printDuplex,
        magneticTracks: action.design.magneticTracks as [string, string, string],
        version: action.design.version,
      }
    default:
      return state
  }
}

function historyReducer(historyState: HistoryState, action: Action): HistoryState {
  if (action.type === "UNDO") {
    if (historyState.past.length === 0) return historyState
    const prev = historyState.past[historyState.past.length - 1]
    return {
      past: historyState.past.slice(0, -1),
      present: prev,
      future: [historyState.present, ...historyState.future],
    }
  }
  if (action.type === "REDO") {
    if (historyState.future.length === 0) return historyState
    const next = historyState.future[0]
    return {
      past: [...historyState.past, historyState.present],
      present: next,
      future: historyState.future.slice(1),
    }
  }

  const newPresent = reduceDesigner(historyState.present, action)
  if (newPresent === historyState.present) return historyState

  // Non-history actions: update present without recording
  if (NON_HISTORY_ACTIONS.has(action.type)) {
    return { ...historyState, present: newPresent }
  }

  return {
    past: [...historyState.past.slice(-MAX_HISTORY), historyState.present],
    present: newPresent,
    future: [],
  }
}

export function useCardDesigner() {
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: getInitialState(),
    future: [],
  })

  const state = history.present

  const addElement = useCallback(
    (type: ElementType, x?: number, y?: number) => {
      const el = createDefaultElement(type, x ?? CARD_WIDTH / 2 - 50, y ?? CARD_HEIGHT / 2 - 20)
      dispatch({ type: "ADD_ELEMENT", element: el })
    },
    []
  )

  const updateElement = useCallback((id: string, changes: Partial<CardElement>) => {
    dispatch({ type: "UPDATE_ELEMENT", id, changes })
  }, [])

  const removeElement = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ELEMENT", id })
  }, [])

  const selectElement = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_ELEMENT", id })
  }, [])

  const duplicateElement = useCallback((id: string) => {
    dispatch({ type: "DUPLICATE_ELEMENT", id })
  }, [])

  const selectedElement = currentElements(state).find((el) => el.id === state.selectedElementId) ?? null

  const elements = currentElements(state)

  const getDesignForSave = useCallback((): CardDesign => {
    return {
      name: state.name,
      description: state.description,
      backgroundColor: state.backgroundColor,
      frontBackgroundImage: state.frontBackgroundImage,
      backBackgroundImage: state.backBackgroundImage,
      backgroundOpacity: state.backgroundOpacity,
      frontElements: state.frontElements,
      backElements: state.backElements,
      printDuplex: state.printDuplex,
      magneticTracks: [...state.magneticTracks],
      version: state.version,
    }
  }, [state])

  return {
    state,
    elements,
    selectedElement,
    dispatch,
    addElement,
    updateElement,
    removeElement,
    selectElement,
    duplicateElement,
    getDesignForSave,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
