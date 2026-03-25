import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!bg-white group-[.toaster]:!text-[#111] group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:!text-[#6B7280]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:!bg-white group-[.toaster]:!text-red-600",
          success: "group-[.toaster]:!bg-white group-[.toaster]:!text-[#111]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
