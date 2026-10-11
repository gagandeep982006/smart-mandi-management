/**
 * Global Top Loader and Fetch Interceptor (Government Portal)
 * Automatically tracks HTTP fetch requests and provides top loading bar
 * updates across all API hits and page navigations.
 */

let listeners = [];
let state = {
  active: false,
  progress: 0,
  visible: false
};

let timer = null;
let activeRequests = 0;
let interceptorInstalled = false;

function notify() {
  listeners.forEach((fn) => fn({ ...state }));
}

export const topLoader = {
  subscribe(fn) {
    listeners.push(fn);
    fn({ ...state });
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  start() {
    if (timer) clearInterval(timer);
    state = { active: true, progress: 18, visible: true };
    notify();

    timer = setInterval(() => {
      if (state.progress < 85) {
        const step = Math.max(1, (90 - state.progress) * 0.12);
        state.progress = Math.min(85, state.progress + step);
        notify();
      }
    }, 120);
  },

  set(percent) {
    state.visible = true;
    state.active = true;
    state.progress = Math.min(100, Math.max(0, percent));
    notify();
  },

  done() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    state.progress = 100;
    notify();

    setTimeout(() => {
      state.visible = false;
      notify();
      setTimeout(() => {
        state.progress = 0;
        state.active = false;
        notify();
      }, 300);
    }, 250);
  },

  requestStarted() {
    activeRequests++;
    if (activeRequests === 1) {
      topLoader.start();
    }
  },

  requestFinished() {
    activeRequests = Math.max(0, activeRequests - 1);
    if (activeRequests === 0) {
      topLoader.done();
    }
  }
};

/**
 * Global fetch interceptor ensuring all fetch() calls in Government Portal
 * trigger the top loading indicator without modifying each individual component/context.
 */
export function initFetchInterceptor() {
  if (interceptorInstalled || typeof window === 'undefined' || !window.fetch) {
    return;
  }

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    topLoader.requestStarted();
    try {
      return await originalFetch.apply(this, args);
    } finally {
      topLoader.requestFinished();
    }
  };

  interceptorInstalled = true;
}
