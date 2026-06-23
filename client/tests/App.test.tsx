import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../src/App';

describe('App', () => {
  it('renders the navigation bar with Squad Assembly branding', async () => {
    render(<App />);
    expect(await screen.findByText('Squad Assembly')).toBeInTheDocument();
  });

  it('renders navigation links', async () => {
    render(<App />);
    expect(await screen.findByRole('link', { name: /new request/i })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /history/i })).toBeInTheDocument();
  });

  it('renders the work request page at root route', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /create work request/i })).toBeInTheDocument();
  });

  it('fetches and displays skills from the API', async () => {
    render(<App />);
    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
    expect(await screen.findByText('React')).toBeInTheDocument();
    expect(await screen.findByText('Node.js')).toBeInTheDocument();
  });

  it('fetches and displays roles from the API', async () => {
    render(<App />);
    expect(await screen.findByText('Engineer')).toBeInTheDocument();
    expect(await screen.findByText('Architect')).toBeInTheDocument();
    expect(await screen.findByText('Tester')).toBeInTheDocument();
  });
});
