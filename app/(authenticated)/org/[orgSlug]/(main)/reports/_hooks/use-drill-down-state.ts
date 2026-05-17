'use client'

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'

const DRILL_PAGE_SIZE = 20

const drillDownParsers = {
  drillKpi: parseAsString.withOptions({ shallow: false }),
  drillPage: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
}

export function useDrillDownState() {
  const [state, setState] = useQueryStates(drillDownParsers)

  function openDrill(kpiId: string) {
    void setState({ drillKpi: kpiId, drillPage: 1 })
  }

  function closeDrill() {
    void setState({ drillKpi: null, drillPage: 1 })
  }

  function setPage(page: number) {
    void setState({ drillPage: page })
  }

  return {
    drillKpi: state.drillKpi,
    drillPage: state.drillPage,
    pageSize: DRILL_PAGE_SIZE,
    openDrill,
    closeDrill,
    setPage,
    isOpen: state.drillKpi !== null,
  }
}
