type Props = {
  stops: string[]
  disclaimer?: string
}

export default function ExcursionRouteSection({ stops, disclaimer }: Props) {
  const items = stops.map((s) => s.trim()).filter(Boolean)
  if (items.length === 0) return null

  return (
    <section className="excursion-parus-section shadow-lg p-4">
      <h2 className="excursion-parus-section__title">Які місця ви побачите</h2>
      <ol className="flex flex-wrap gap-2 drop-shadow-[0_0_10px_rgba(0,0,0,0.08)] sm:items-start">
        {items.map((stop) => (
            <li className={'bg-white rounded-3xl border border-[#f7f7f7] h-12 px-3 flex gap-3 items-center w-full sm:w-auto'}
                key={stop}>
                <div
                    className="w-6 h-6 shrink-0 bg-teal rounded-full flex items-center justify-center text-white font-extrabold ">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                    >
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M13.3337 6.66683C13.3337 9.9955 9.64099 13.4622 8.40099 14.5328C8.28547 14.6197 8.14486 14.6667 8.00033 14.6667C7.85579 14.6667 7.71518 14.6197 7.59966 14.5328C6.35966 13.4622 2.66699 9.9955 2.66699 6.66683C2.66699 5.25234 3.2289 3.89579 4.22909 2.89559C5.22928 1.8954 6.58584 1.3335 8.00033 1.3335C9.41481 1.3335 10.7714 1.8954 11.7716 2.89559C12.7718 3.89579 13.3337 5.25234 13.3337 6.66683ZM8.00033 8.66683C9.10489 8.66683 10.0003 7.7714 10.0003 6.66683C10.0003 5.56226 9.10489 4.66683 8.00033 4.66683C6.89576 4.66683 6.00033 5.56226 6.00033 6.66683C6.00033 7.7714 6.89576 8.66683 8.00033 8.66683Z"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <div className="fw-full">
                    <div className="font-medium p_no_margin sm:text-nowrap">{stop}</div>
                </div>

            </li>
        ))}
      </ol>
        {disclaimer?.trim() && (
            <p className="excursion-parus-muted mt-4">{disclaimer.trim()}</p>
        )}
    </section>
  )
}
