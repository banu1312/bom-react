import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import useGetReservationDetails from "@/hooks/query/reservation/useGetReservationDetails";
import ReservationForm from "./ReservationForm";

export default function EditSheet({
  id,
  open,
  onSuccess,
}: {
  id: number | null;
  open: boolean;
  onSuccess: (id: number) => void;
}) {
  const { data, isLoading, isError, isSuccess } = useGetReservationDetails(id, {
    enabled: open,
  });

  return (
    <SheetContent className="w-5/6 sm:max-w-2xl overflow-y-scroll">
      <SheetHeader>
        <SheetTitle>Edit reservation</SheetTitle>
        <SheetDescription>Update the details of an reservation.</SheetDescription>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        {isLoading ? (
          <Skeleton className="w-full h-[20px] rounded-full" />
        ) : isError ? (
          <h2 className="text-center bg-destructive text-destructive-foreground font-semibold animate-pulse p-2 rounded-lg">
            Error loading details!
          </h2>
        ) : (
          isSuccess && <ReservationForm mode="update" data={data.data} onSuccess={onSuccess} />
        )}
      </div>
    </SheetContent>
  );
}
