import '@testing-library/jest-dom';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Моки Ant Design брейкпоинтов и responsiveObserver
jest.mock('antd/lib/grid/hooks/useBreakpoint', () => () => ({ xs:false, sm:false, md:false, lg:false, xl:false, xxl:false }));
jest.mock('antd/lib/_util/responsiveObserver', () => {
  const listeners = new Set();
  return {
    responsiveMap: {},
    subscribe: l => { listeners.add(l); return () => listeners.delete(l); },
    unsubscribe: l => listeners.delete(l),
    dispatch: () => {},
    collect: () => {},
  };
});

// Глобальные моки браузерных API
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(q => ({
    matches: false, media: q, onchange: null,
    addListener: jest.fn(), removeListener: jest.fn()
  }))
});
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: jest.fn().mockReturnValue({ toString: () => '' })
});
class MockResizeObserver { observe(){} unobserve(){} disconnect(){} }
global.ResizeObserver = MockResizeObserver;
global.IntersectionObserver = MockResizeObserver;
global.requestAnimationFrame = cb => setTimeout(cb, 0);
global.cancelAnimationFrame = id => clearTimeout(id);
Object.defineProperty(window, 'localStorage', {
  value: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn(), length:0, key: jest.fn() }
});
Object.defineProperty(window, 'sessionStorage', { value: window.localStorage });
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(), readText: jest.fn().mockResolvedValue('') }
});

// Отключаем React 18 warnings
console.warn = () => {};
console.error = () => {};

beforeEach(() => jest.clearAllMocks());
