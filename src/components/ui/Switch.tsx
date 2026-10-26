import * as RSwitch from '@radix-ui/react-switch'

export function Switch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="relative h-6 w-11 rounded-full bg-[var(--bg-sunken)] data-[state=checked]:bg-[var(--accent)] transition-colors outline-none border"
    >
      <RSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
    </RSwitch.Root>
  )
}
