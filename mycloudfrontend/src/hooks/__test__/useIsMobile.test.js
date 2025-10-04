import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../../hooks/useIsMobile';

// Мокаем window методы
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
});

describe('useIsMobile Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false for desktop screen width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('should return true for mobile screen width', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('should add resize event listener on mount', () => {
    renderHook(() => useIsMobile());
    expect(mockAddEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });

  it('should remove resize event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });

  it('should update value when window is resized', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    const { result } = renderHook(() => useIsMobile());

    // Найти вызов addEventListener и получить handler
    const resizeCall = mockAddEventListener.mock.calls.find(
      call => call[0] === 'resize'
    );
    const resizeHandler = resizeCall[1];
    expect(typeof resizeHandler).toBe('function');

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      resizeHandler();
    });

    expect(result.current).toBe(true);
  });

  it('should handle breakpoint edge cases', () => {
    const breakpoint = 768;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: breakpoint,
    });
    const { result } = renderHook(() => useIsMobile(breakpoint));
    expect(result.current).toBe(false);

    // 1px below breakpoint
    const resizeCall = mockAddEventListener.mock.calls.find(
      call => call[0] === 'resize'
    );
    const resizeHandler = resizeCall[1];

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoint - 1,
      });
      resizeHandler();
    });

    expect(result.current).toBe(true);
  });
});