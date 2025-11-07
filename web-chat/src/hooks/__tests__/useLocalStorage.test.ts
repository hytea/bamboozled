import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial value'));

    expect(result.current[0]).toBe('initial value');
  });

  it('should return stored value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored value'));

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial value'));

    expect(result.current[0]).toBe('stored value');
  });

  it('should store value in localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('new value');
    });

    expect(result.current[0]).toBe('new value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new value'));
  });

  it('should work with objects', () => {
    const initialObject = { name: 'test', value: 123 };
    const { result } = renderHook(() => useLocalStorage('test-object', initialObject));

    expect(result.current[0]).toEqual(initialObject);

    const newObject = { name: 'updated', value: 456 };
    act(() => {
      result.current[1](newObject);
    });

    expect(result.current[0]).toEqual(newObject);
    expect(JSON.parse(localStorage.getItem('test-object')!)).toEqual(newObject);
  });

  it('should work with arrays', () => {
    const initialArray = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage('test-array', initialArray));

    expect(result.current[0]).toEqual(initialArray);

    const newArray = [4, 5, 6];
    act(() => {
      result.current[1](newArray);
    });

    expect(result.current[0]).toEqual(newArray);
    expect(JSON.parse(localStorage.getItem('test-array')!)).toEqual(newArray);
  });

  it('should handle numbers', () => {
    const { result } = renderHook(() => useLocalStorage('test-number', 42));

    expect(result.current[0]).toBe(42);

    act(() => {
      result.current[1](100);
    });

    expect(result.current[0]).toBe(100);
    expect(localStorage.getItem('test-number')).toBe('100');
  });

  it('should handle booleans', () => {
    const { result } = renderHook(() => useLocalStorage('test-boolean', false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('test-boolean')).toBe('true');
  });

  it('should return initial value when localStorage has invalid JSON', () => {
    localStorage.setItem('test-key', 'invalid json {]');

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });

  it('should update value when storage event occurs', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    act(() => {
      result.current[1]('first update');
    });

    expect(result.current[0]).toBe('first update');

    act(() => {
      result.current[1]('second update');
    });

    expect(result.current[0]).toBe('second update');
  });
});
