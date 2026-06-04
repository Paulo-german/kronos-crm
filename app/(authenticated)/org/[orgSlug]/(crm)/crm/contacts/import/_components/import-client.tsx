'use client'

import { useState, useCallback } from 'react'
import { ImportStepper } from './import-stepper'
import { UploadStep } from './upload-step'
import { MappingStep } from './mapping-step'
import { PreviewStep } from './preview-step'
import type { ImportRow } from '@/_actions/contact/import-contacts/schema'
import type { CompanyDto } from '@/_data-access/company/get-companies'

interface ParsedData {
  headers: string[]
  rows: string[][]
}

interface ImportClientProps {
  companies: CompanyDto[]
  quotaCurrent: number
  quotaLimit: number
}

export function ImportClient({
  companies,
  quotaCurrent,
  quotaLimit,
}: ImportClientProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [mappedRows, setMappedRows] = useState<ImportRow[]>([])

  const handleParsed = useCallback((data: ParsedData) => {
    setParsedData(data)
    setCurrentStep(1)
  }, [])

  const handleMapped = useCallback((rows: ImportRow[]) => {
    setMappedRows(rows)
    setCurrentStep(2)
  }, [])

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  return (
    <div className="space-y-6">
      <ImportStepper currentStep={currentStep} />

      {currentStep === 0 && <UploadStep onParsed={handleParsed} />}

      {currentStep === 1 && parsedData && (
        <MappingStep
          headers={parsedData.headers}
          rows={parsedData.rows}
          onMapped={handleMapped}
          onBack={goBack}
        />
      )}

      {currentStep === 2 && mappedRows.length > 0 && (
        <PreviewStep
          mappedRows={mappedRows}
          companies={companies}
          quotaCurrent={quotaCurrent}
          quotaLimit={quotaLimit}
          onBack={goBack}
        />
      )}
    </div>
  )
}
