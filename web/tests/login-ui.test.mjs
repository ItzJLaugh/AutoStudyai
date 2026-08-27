import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme } from '../lib/theme.js';
import { validateAuthFields } from '../lib/auth-form.js';

test('public authentication routes stay light when the workspace theme is dark', () => {
  assert.equal(resolveTheme('/', 'dark'), 'light');
  assert.equal(resolveTheme('/reset-password', 'dark'), 'light');
});

test('authenticated workspace routes preserve the saved dark theme', () => {
  assert.equal(resolveTheme('/dashboard', 'dark'), 'dark');
  assert.equal(resolveTheme('/smartnotes', 'dark'), 'dark');
});

test('sign in reports empty fields inline before making a request', () => {
  assert.deepEqual(validateAuthFields({ email: '', password: '', isSignup: false }), {
    email: 'Enter your email address.',
    password: 'Enter your password.',
  });
});

test('sign up reports an invalid email, short password, and missing name', () => {
  assert.deepEqual(validateAuthFields({ email: 'not-an-email', password: '123', name: '', isSignup: true }), {
    name: 'Enter your full name.',
    email: 'Enter a valid email address.',
    password: 'Password must be at least 6 characters.',
  });
});

test('valid sign-in values produce no field errors', () => {
  assert.deepEqual(validateAuthFields({ email: 'student@example.com', password: 'secret1', isSignup: false }), {});
});

