import { suite } from 'uvu'
import * as assert from 'uvu/assert'
import { useAutoLayout } from '../composables/useAutoLayout'

const test = suite('auto layout')
const { generateAutoLayout } = useAutoLayout()

function runCase(s: number, c: number) {
  const layout = generateAutoLayout(s, c)
  assert.equal(layout.length, s + c)
}

test('all straight', () => runCase(2, 0))
test('all curves', () => runCase(0, 2))
test('mixed equal', () => runCase(3, 3))
test('mixed uneven', () => runCase(5, 4))

test.run()
