import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function Selector({
  title,
  setOption,
  option,
  options,
}: {
  title: string
  setOption: any
  option: string
  options: string[]
}) {
  return (
    <div className="flex w-48 items-center justify-between">
      <p className="capitalize">{title}:</p>
      <Select value={option} onValueChange={setOption}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="capitalize">{title}s</SelectLabel>
            {options.map((o: string, i: number) => (
              <SelectItem key={i} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
