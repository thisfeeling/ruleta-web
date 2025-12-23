import { describe, it, expect, beforeEach } from 'vitest'
import { storageService } from './storage.service'

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('set/get/remove/has works', () => {
    storageService.set('foo', { a: 1 })
    expect(storageService.has('foo')).toBe(true)
    expect(storageService.get('foo')).toEqual({ a: 1 })

    storageService.remove('foo')
    expect(storageService.has('foo')).toBe(false)
  })

  it('clear removes only prefixed keys', () => {
    localStorage.setItem('other', 'x')
    storageService.set('a', 1)
    storageService.set('b', 2)
    storageService.clear()

    expect(localStorage.getItem('other')).toEqual('x')
    expect(storageService.has('a')).toBe(false)
    expect(storageService.has('b')).toBe(false)
  })

  it('helpers for player session and settings', () => {
    storageService.savePlayerSession({ id: 1 })
    expect(storageService.getPlayerSession()).toEqual({ id: 1 })

    storageService.saveSettings({ language: 'es-CO' })
    expect(storageService.getSettings()).toEqual({ language: 'es-CO' })
  })
})
