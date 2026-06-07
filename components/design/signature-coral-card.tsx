import { cn } from "@/lib/utils";

type SignatureCoralCardProps = {
  title: string;
  description: string;
  className?: string;
};

export function SignatureCoralCard({
  title,
  description,
  className,
}: SignatureCoralCardProps) {
  return (
    <article
      className={cn(
        "rounded-lg bg-primary p-8 text-on-yellow md:p-10",
        className,
      )}
    >
      <h2 className="text-display-sm mb-4">{title}</h2>
      <p className="text-body-md max-w-2xl opacity-90">{description}</p>
    </article>
  );
}
