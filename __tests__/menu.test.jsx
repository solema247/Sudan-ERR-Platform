import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Home from '../pages/index'
import MainApp from '../pages/main/MainApp'

jest.mock('next/router', () => require('next-router-mock'));

describe('Index', () => {
    it('loads main page', () => {
        render(<Home/>)
    })
})

describe('Main app', () => {
    it('loads main app', () => {
        render(<MainApp/>)
    })

    // TODO: Test chat features.
})
