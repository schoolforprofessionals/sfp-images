import { expect, test } from 'bun:test'
import { parseCorsOrigins } from '../src/api/cors.ts'

test('parseCorsOrigins rejects invalid origins', () => {
  expect(() => parseCorsOrigins('not-a-url')).toThrow()
})

test('parseCorsOrigins returns undefined for blank strings', () => {
  expect(parseCorsOrigins('   ')).toBeUndefined()
})

test('parseCorsOrigins returns undefined for missing values', () => {
  expect(parseCorsOrigins(undefined)).toBeUndefined()
})

test('parseCorsOrigins trims, deduplicates, and sorts origins', () => {
  expect(parseCorsOrigins(' https://b.example , https://a.example , https://a.example ')).toEqual([
    'https://a.example',
    'https://b.example',
  ])
})

test('parseCorsOrigins normalizes values to URL origins', () => {
  expect(parseCorsOrigins('https://b.example/path?query=1, https://a.example/#hash')).toEqual([
    'https://a.example',
    'https://b.example',
  ])
})
