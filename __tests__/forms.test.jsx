import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import NewProject from '../components/forms/NewProject/NewProjectForm';
import ReportingForm from '../components/forms/Report/ReportingForm';


describe('Index', () => {
    it('loads F1 Project Form', () => {
        render(<NewProject/>)
    })

    it('loads F4 Financial Reporting Form', () => {
        render(<ReportingForm/>)
    })

    
})

