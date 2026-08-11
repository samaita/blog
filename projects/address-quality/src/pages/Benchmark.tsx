import { Link } from "react-router-dom"
import Container from "@/components/layout/Container"
import Card from "@/components/common/Card"
import Badge from "@/components/common/Badge"
import { ChevronRightIcon } from "@/components/icons"
import { PageHeader } from "@/components/kumo-ui"
import { BENCHMARKS } from "@/data/benchmarks"

export default function Benchmark() {
  return (
    <Container className="pb-24">
      <PageHeader
        title="Benchmark"
        description="Performance and accuracy benchmark results for each Address Quality release."
      />

      {BENCHMARKS.length === 0 ? (
        <div className="rounded-2xl border border-surface-200 bg-surface-50 p-8 text-center">
          <p className="text-sm text-surface-500">No benchmark results published yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENCHMARKS.map((version) => (
            <Link key={version} to={`/benchmark/${version}`} className="group">
              <Card hover className="flex h-full items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900">{version}</p>
                  <p className="mt-1 text-xs text-surface-500">
                    Benchmark report for this release
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Report</Badge>
                  <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-surface-400 transition-colors group-hover:text-accent-600" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  )
}
