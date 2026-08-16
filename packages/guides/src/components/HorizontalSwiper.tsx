import { Children, type ReactNode } from 'react'
import { cn } from '@gaido/ui-primitives/cn'

type HorizontalSwiperProps = {
  children: ReactNode
  desktopClassName?: string
  slideClassName?: string
}

export default function HorizontalSwiper({
  children,
  desktopClassName = 'hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 drop-shadow-[0_0_10px_rgba(0,0,0,0.08)]',
  slideClassName = 'w-[72vw] max-w-[300px] shrink-0 snap-start',
}: HorizontalSwiperProps) {
  const items = Children.toArray(children)

  return (
    <>
      <div className="md:hidden">
        <div className="-mx-5 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
          <div className="flex snap-x snap-mandatory gap-3 px-5">
            {items.map((child, index) => (
              <div key={index} className={slideClassName}>
                {child}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={cn(desktopClassName)}>{children}</div>
    </>
  )
}
