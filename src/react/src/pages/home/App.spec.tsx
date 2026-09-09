import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from './App'

describe('Home Dashboard', () => {

    test('renders the main content', () => {
        render(<App/>)

        expect(
            screen.getByRole('heading', {name: 'Get started'})
        ).toBeInTheDocument()

        expect(
            screen.getByRole('heading', {name: 'Documentation'})
        ).toBeInTheDocument()

        expect(
            screen.getByRole('heading', {name: 'Connect with us'})
        ).toBeInTheDocument()
    })

    test('counter starts at zero', () => {
        render(<App/>)

        expect(
            screen.getByRole('button', {name: 'Count is 0'})
        ).toBeInTheDocument()
    })

    test('increments counter when user clicks the button', async () => {
        const user = userEvent.setup()

        render(<App/>)

        const counterButton = screen.getByRole('button', {
            name: 'Count is 0'
        })

        await user.click(counterButton)

        expect(
            screen.getByRole('button', {name: 'Count is 1'})
        ).toBeInTheDocument()
    })

    test('increments counter multiple times', async () => {
        const user = userEvent.setup()

        render(<App/>)

        const counterButton = screen.getByRole('button', {
            name: 'Count is 0'
        })

        await user.click(counterButton)
        await user.click(counterButton)
        await user.click(counterButton)

        expect(
            screen.getByRole('button', {name: 'Count is 3'})
        ).toBeInTheDocument()
    })

    test('renders documentation links with correct destinations', () => {
        render(<App/>)

        expect(
            screen.getByRole('link', {name: /Explore Vite/i})
        ).toHaveAttribute('href', 'https://vite.dev/')

        expect(
            screen.getByRole('link', {name: /Learn more/i})
        ).toHaveAttribute('href', 'https://react.dev/')
    })
})
