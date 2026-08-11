import { useEffect, useRef, type RefObject } from 'react'

type DragState = {
  active: boolean
  startX: number
  scrollLeft: number
}

export function useDragScroll(
  ref: RefObject<HTMLDivElement | null>,
  onScrollChange?: () => void,
) {
  const draggedRef = useRef(false)
  const dragState = useRef<DragState>({ active: false, startX: 0, scrollLeft: 0 })
  const onScrollChangeRef = useRef(onScrollChange)
  onScrollChangeRef.current = onScrollChange

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 && e.button !== 2) return
      dragState.current = { active: true, startX: e.pageX, scrollLeft: el.scrollLeft }
      draggedRef.current = false
      el.classList.add('cursor-grabbing', 'select-none')
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragState.current.active) return
      e.preventDefault()
      const dx = e.pageX - dragState.current.startX
      if (Math.abs(dx) > 4) draggedRef.current = true
      el.scrollLeft = dragState.current.scrollLeft - dx
      onScrollChangeRef.current?.()
    }

    const onMouseUp = () => {
      if (!dragState.current.active) return
      dragState.current.active = false
      el.classList.remove('cursor-grabbing', 'select-none')
    }

    const onContextMenu = (e: MouseEvent) => {
      if (dragState.current.active || draggedRef.current) e.preventDefault()
    }

    el.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    el.addEventListener('contextmenu', onContextMenu)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('contextmenu', onContextMenu)
      el.classList.remove('cursor-grabbing', 'select-none')
    }
  }, [ref])

  const consumeDragClick = () => {
    if (!draggedRef.current) return false
    draggedRef.current = false
    return true
  }

  return { consumeDragClick }
}
