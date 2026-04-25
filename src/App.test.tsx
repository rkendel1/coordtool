import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PDF Field Mapper title', () => {
  render(<App />);
  expect(screen.getByText(/PDF Field Mapper/i)).toBeInTheDocument();
});

test('renders upload prompt', () => {
  render(<App />);
  expect(screen.getByText(/Upload a PDF Form/i)).toBeInTheDocument();
});
