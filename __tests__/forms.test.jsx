import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import NewProject from '../components/forms/NewProject/NewProject';
import FillForm from '../components/forms/Report/fill-form';


describe('Index', () => {
    it('loads F1 Project Form', () => {
        render(<NewProject/>)
    })

    it('loads F4 Financial Reporting Form', () => {
        render(<FillForm/>)
    })

    it('submits a valid request to the server', () => {

    })
})

