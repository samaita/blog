import { useParams, Link } from "react-router-dom"
import Container from "@/components/layout/Container"
import { BENCHMARKS } from "@/data/benchmarks"

export default function BenchmarkDetail() {
  const { version = "" } = useParams<{ version: string }>()

  if (!BENCHMARKS.includes(version)) {
    return (
      <Container className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-6xl font-semibold text-surface-300">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-surface-900">
          Benchmark not found
        </h1>
        <p className="mt-2 text-surface-500">
          There is no benchmark report for the release "{version}".
        </p>
        <Link
          to="/benchmark"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-accent-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-all duration-150 hover:bg-accent-700"
        >
          Back to benchmark
        </Link>
      </Container>
    )
  }

  return (
    <Container>
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 pt-10 text-sm text-surface-500"
      >
        <Link
          to="/benchmark"
          className="font-medium text-accent-700 hover:text-accent-900"
        >
          Benchmark
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-surface-900">{version}</span>
      </nav>

      <iframe
        src={`${import.meta.env.BASE_URL}benchmark/${version}/`}
        title="Address Quality Benchmark"
        className="sticky top-16 block h-[calc(100dvh-4rem)] w-full border-0"
      />
    </Container>
  )
}
