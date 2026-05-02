import React, { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  // Search state
  searchQuery: '',
  searchLocation: '',
  searchRadius: 25,
  searchFilters: {
    budgetRange: null,
    patientAge: '',
    comorbidities: [],
    hospitalType: 'both',
    accreditation: 'any',
  },
  // Results
  results: null,
  isLoading: false,
  // Emergency
  isEmergency: false,
  // Language
  language: 'en',
  // Toast queue
  toasts: [],
  // PDF export
  isExporting: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_LOCATION':
      return { ...state, searchLocation: action.payload };
    case 'SET_RADIUS':
      return { ...state, searchRadius: action.payload };
    case 'SET_FILTERS':
      return { ...state, searchFilters: { ...state.searchFilters, ...action.payload } };
    case 'SET_RESULTS':
      return { ...state, results: action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_EMERGENCY':
      return { ...state, isEmergency: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { id: Date.now(), ...action.payload }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_EXPORTING':
      return { ...state, isExporting: action.payload };
    case 'RESET_SEARCH':
      return { ...state, results: null, isEmergency: false };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addToast = useCallback((toast) => {
    dispatch({ type: 'ADD_TOAST', payload: toast });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: toast.id || Date.now() });
    }, toast.duration || 4000);
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, addToast, removeToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
