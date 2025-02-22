import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { Loader2Icon, MinusCircleIcon, PlusCircleIcon, TableIcon } from "lucide-react";
import { isAxiosError } from "axios";
import { z } from "zod";
import { formSchema } from "../data/schema";
import { useToast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Reservation } from "@/types/reservation";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import PlanLookup from "./PlanLookup";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { ItemScannerNew } from "./ItemScannerNew";
import useAddReservation from "@/hooks/query/reservation/useAddReservation";
import useUpdateReservation from "@/hooks/query/reservation/useUpdateReservation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormProps = { onSuccess: (id: number) => void } & (
  | {
      mode: "add";
    }
  | {
      mode: "update";
      data: Reservation;
    }
);

type FormValues = z.infer<typeof formSchema>;

export default function ReservationForm(props: FormProps) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues:
      props.mode === "update"
        ? {
            reservation_code: props.data.reservation_code,
            pickupPlan_code: props.data.pickupPlan_code,
            returnPlan_code: props.data.returnPlan_code ?? "",
            information: props.data.information ?? "",
            status: props.data.status,
            motor: props.data.motor_items.map((item) => ({ motor_code: item.code })),
            fak: props.data.fak_items.map((item) => ({ fak_code: item.code })),
            hardcase: props.data.hardcase_items.map((item) => ({ hardcase_code: item.code })),
            helmet: props.data.helmet_items.map((item) => ({ helmet_code: item.code })),
          }
        : {
            reservation_code: "",
            pickupPlan_code: "",
            returnPlan_code: "",
            information: "",
            motor: [],
            fak: [],
            hardcase: [],
            helmet: [],
          },
  });

  // Dev:
  // {
  //   reservation_code: "",
  //   pickupPlan_code: "",
  //   returnPlan_code: "",
  //   information: "",
  //   motor: [{ motor_code: "MOTR1" }],
  //   fak: [{ fak_code: "FAK1" }],
  //   hardcase: [],
  //   helmet: [{ helmet_code: "HELM1" }],
  // },
  const { isSubmitting, isDirty } = form.formState;
  const [type, setType] = useState<"pickup" | "return">(() => {
    if (props.mode === "update" && props.data.pickupPlan_code) return "return";
    return "pickup";
  });

  useEffect(() => {
    form.setValue("status", type === "pickup" ? "In Rental" : "Finished Rental");
  }, [form, type]);

  const { mutateAsync: updateMutate } = useUpdateReservation();
  const { mutateAsync: addMutate } = useAddReservation();

  const onSubmit: SubmitHandler<FormValues> = async (payload) => {
    let res_code = "";
    try {
      if (props.mode === "update") {
        if (!payload.returnPlan_code || payload.returnPlan_code === "") {
          form.setError("returnPlan_code", {
            type: "required",
            message: "The return plan field is required!",
          });
          return;
        }

        if (
          !payload.motor.every((m) => m.status !== undefined) ||
          !payload.fak.every((m) => m.status !== undefined) ||
          !payload.helmet.every((m) => m.status !== undefined)
        ) {
          form.setError("motor", { type: "required", message: "The status field is required!" });
          form.setError("helmet", { type: "required", message: "The status field is required!" });
          form.setError("fak", { type: "required", message: "The status field is required!" });
          if (
            payload.hardcase !== undefined &&
            payload.hardcase.length > 0 &&
            !payload.hardcase.every((m) => m.status !== undefined)
          ) {
            form.setError("hardcase", {
              type: "required",
              message: "The status field is required!",
            });
          }
          return;
        }

        const res = await updateMutate({
          id: props.data.id,
          data: {
            ...payload,
            returnPlan_code: payload.returnPlan_code || undefined,
            information: payload.information || undefined,
          },
        });

        form.reset({
          reservation_code: res.reservation_code,
          pickupPlan_code: res.pickupPlan_code,
          returnPlan_code: res.returnPlan_code ?? "",
          information: res.information ?? "",
          status: res.status,
          motor: res.motor_items.map((item) => ({ motor_code: item.code })),
          fak: res.fak_items.map((item) => ({ fak_code: item.code })),
          hardcase: res.hardcase_items.map((item) => ({ hardcase_code: item.code })),
          helmet: res.helmet_items.map((item) => ({ helmet_code: item.code })),
        });
        props.onSuccess(res.id);

        res_code = res.reservation_code;
      } else {
        const res = await addMutate({
          data: {
            ...payload,
            returnPlan_code: payload.returnPlan_code || undefined,
            information: payload.information || undefined,
          },
        });

        form.reset({
          reservation_code: "",
          pickupPlan_code: "",
          returnPlan_code: "",
          information: "",
          motor: [],
          helmet: [],
          fak: [],
          hardcase: [],
        });
        props.onSuccess(res.id);

        res_code = res.reservation_code;
      }

      toast({
        title: "Successfully saved reservation",
        description: `Reservation with the code "${res_code}" has been saved.`,
        variant: "default",
      });
    } catch (e) {
      console.error(e);

      if (isAxiosError<{ message: string; error: { [key: string]: string[] } }>(e)) {
        const errFields = [
          "reservation_code",
          "pickupPlan_code",
          "returnPlan_code",
          "information",
          "motor",
          "helmet",
          "fak",
          "hardcase",
          "status",
        ];

        if (e.response && e.response.status === 400) {
          const errors = e.response.data.error ?? {};

          Object.keys(errors).forEach((errKey) => {
            if (errFields.includes(errKey)) {
              const errKeyKnown = errKey as keyof FormValues;
              form.setError(errKeyKnown, { message: errors[errKeyKnown].join(",") });
            } else {
              form.setError(`root.custom.${errKey}`, { message: errors[errKey].join(",") });
            }
          });
        } else {
          toast({
            title: "Failed saving reservation",
            description: `An error has occured, ${e.response?.data.message}`,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Failed saving reservation",
          description: `An error has occured, ${(e as Error).message}`,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col items-stretch gap-4">
        <div className="grid gap-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              onValueChange={(value) => setType(value as typeof type)}
              defaultValue={type}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pickup" id="pickup" />
                <Label htmlFor="pickup">Pick Up</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="return" id="return" />
                <Label htmlFor="return">Return</Label>
              </div>
            </RadioGroup>
          </div>

          <FormField
            control={form.control}
            name="reservation_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="Reservation code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {type === "pickup" && (
            <FormField
              control={form.control}
              name="pickupPlan_code"
              render={({ field: { value, onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel>Pickup Plan</FormLabel>
                  <Dialog>
                    <PlanLookup
                      value={value}
                      onSelect={(code) => {
                        onChange(code);
                      }}
                    />
                    <FormControl>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full justify-between"
                          {...rest}
                        >
                          {value || "Select a Plan code"}
                          <TableIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DialogTrigger>
                    </FormControl>
                  </Dialog>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {type === "return" && (
            <FormField
              control={form.control}
              name="returnPlan_code"
              render={({ field: { value, onChange, ...rest } }) => (
                <FormItem>
                  <FormLabel>Return Plan</FormLabel>
                  <Dialog>
                    <PlanLookup
                      value={value}
                      onSelect={(code) => {
                        onChange(code);
                      }}
                    />
                    <FormControl>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full justify-between"
                          {...rest}
                        >
                          {value || "Select a Plan code"}
                          <TableIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DialogTrigger>
                    </FormControl>
                  </Dialog>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="information"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Information</FormLabel>
                <FormControl>
                  <Textarea placeholder="Information" className="resize-y" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="motor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motors</FormLabel>
                <Drawer>
                  <FormControl>
                    <DrawerTrigger asChild>
                      <Button variant="secondary" type="button" className="w-full justify-between">
                        <PlusCircleIcon className="w-4 h-4" /> Add Motor{"(s)"} via QR
                        <TableIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DrawerTrigger>
                  </FormControl>
                  <DrawerContent>
                    <ItemScannerNew
                      values={field.value.map(({ motor_code }) => motor_code)}
                      onSubmit={(result) =>
                        field.onChange([...field.value, { motor_code: result }])
                      }
                    />
                  </DrawerContent>
                </Drawer>
                <FormMessage />
                {field.value.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {field.value.map(({ motor_code, status }) => (
                      <li
                        key={motor_code}
                        className="border border-border flex flex-row sm:flex-row justify-between gap-2 rounded-md"
                      >
                        <span className="block px-5 py-2 truncate">{motor_code}</span>
                        <div className="flex">
                          {type === "return" && (
                            <Select
                              value={status}
                              onValueChange={(status) => {
                                const values = field.value;
                                const foundIndex = values.findIndex(
                                  (v) => v.motor_code === motor_code
                                );
                                values[foundIndex] = {
                                  motor_code,
                                  status: status as FormValues["motor"][number]["status"],
                                };
                                field.onChange(values);
                              }}
                            >
                              <SelectTrigger className="w-[100px] sm:w-[180px] rounded-none border-none bg-secondary transition-colors">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Ready For Rent">Ready For Rent</SelectItem>
                                <SelectItem value="Out Of Service">Out Of Service</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="rounded-none"
                            onClick={() =>
                              field.onChange(field.value.filter((v) => v.motor_code !== motor_code))
                            }
                          >
                            <MinusCircleIcon className="w-5 h-5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="block text-muted-foreground text-center w-full">No items</span>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="helmet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Helmets</FormLabel>
                <Drawer>
                  <FormControl>
                    <DrawerTrigger asChild>
                      <Button variant="secondary" type="button" className="w-full justify-between">
                        <PlusCircleIcon className="w-4 h-4" /> Add Helmet{"(s)"} via QR
                        <TableIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DrawerTrigger>
                  </FormControl>
                  <DrawerContent>
                    <ItemScannerNew
                      values={field.value.map(({ helmet_code }) => helmet_code)}
                      onSubmit={(result) =>
                        field.onChange([...field.value, { helmet_code: result }])
                      }
                    />
                  </DrawerContent>
                </Drawer>
                <FormMessage />
                {field.value.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {field.value.map(({ helmet_code, status }) => (
                      <li
                        key={helmet_code}
                        className="border border-border flex flex-row sm:flex-row justify-between gap-2 rounded-md"
                      >
                        <span className="block px-5 py-2 truncate">{helmet_code}</span>
                        <div className="flex">
                          {type === "return" && (
                            <Select
                              value={status}
                              onValueChange={(status) => {
                                const values = field.value;
                                const foundIndex = values.findIndex(
                                  (v) => v.helmet_code === helmet_code
                                );
                                values[foundIndex] = {
                                  helmet_code,
                                  status: status as FormValues["helmet"][number]["status"],
                                };
                                field.onChange(values);
                              }}
                            >
                              <SelectTrigger className="w-[100px] sm:w-[180px] rounded-none border-none bg-secondary transition-colors">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Ready For Rent">Ready For Rent</SelectItem>
                                <SelectItem value="Scrab">Scrab</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="rounded-none"
                            onClick={() =>
                              field.onChange(
                                field.value.filter((v) => v.helmet_code !== helmet_code)
                              )
                            }
                          >
                            <MinusCircleIcon className="w-5 h-5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="block text-muted-foreground text-center w-full">No items</span>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fak"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Aid Kits</FormLabel>
                <Drawer>
                  <FormControl>
                    <DrawerTrigger asChild>
                      <Button variant="secondary" type="button" className="w-full justify-between">
                        <PlusCircleIcon className="w-4 h-4" /> Add FAK{"(s)"} via QR
                        <TableIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DrawerTrigger>
                  </FormControl>
                  <DrawerContent>
                    <ItemScannerNew
                      values={field.value.map(({ fak_code }) => fak_code)}
                      onSubmit={(result) => field.onChange([...field.value, { fak_code: result }])}
                    />
                  </DrawerContent>
                </Drawer>
                <FormMessage />
                {field.value.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {field.value.map(({ fak_code, status }) => (
                      <li
                        key={fak_code}
                        className="border border-border flex flex-row sm:flex-row justify-between gap-2 rounded-md"
                      >
                        <span className="block px-5 py-2 truncate">{fak_code}</span>
                        <div className="flex">
                          {type === "return" && (
                            <Select
                              value={status}
                              onValueChange={(status) => {
                                const values = field.value;
                                const foundIndex = values.findIndex((v) => v.fak_code === fak_code);
                                values[foundIndex] = {
                                  fak_code,
                                  status: status as FormValues["fak"][number]["status"],
                                };
                                field.onChange(values);
                              }}
                            >
                              <SelectTrigger className="w-[100px] sm:w-[180px] rounded-none border-none bg-secondary transition-colors">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Complete">Complete</SelectItem>
                                <SelectItem value="Incomplete">Incomplete</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="rounded-none"
                            onClick={() =>
                              field.onChange(field.value.filter((v) => v.fak_code !== fak_code))
                            }
                          >
                            <MinusCircleIcon className="w-5 h-5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="block text-muted-foreground text-center w-full">No items</span>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hardcase"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hardcases</FormLabel>
                <Drawer>
                  <FormControl>
                    <DrawerTrigger asChild>
                      <Button variant="secondary" type="button" className="w-full justify-between">
                        <PlusCircleIcon className="w-4 h-4" /> Add Hardcase{"(s)"} via QR
                        <TableIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DrawerTrigger>
                  </FormControl>
                  <DrawerContent>
                    <ItemScannerNew
                      values={field.value?.map(({ hardcase_code }) => hardcase_code) ?? []}
                      onSubmit={(result) =>
                        field.onChange([...(field.value ?? []), { hardcase_code: result }])
                      }
                    />
                  </DrawerContent>
                </Drawer>
                <FormMessage />
                {field.value && field.value.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {field.value.map(({ hardcase_code, status }) => (
                      <li
                        key={hardcase_code}
                        className="border border-border flex flex-row sm:flex-row justify-between gap-2 rounded-md"
                      >
                        <span className="block px-5 py-2 truncate">{hardcase_code}</span>
                        <div className="flex">
                          {type === "return" && (
                            <Select
                              value={status}
                              onValueChange={(status) => {
                                const values = field.value;
                                if (!values) return;

                                const foundIndex = values.findIndex(
                                  (v) => v.hardcase_code === hardcase_code
                                );
                                values[foundIndex] = {
                                  hardcase_code,
                                  status: status as "Lost" | "Scrab" | "Ready For Rent" | undefined,
                                };
                                field.onChange(values);
                              }}
                            >
                              <SelectTrigger className="w-[100px] sm:w-[180px] rounded-none border-none bg-secondary transition-colors">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Ready For Rent">Ready For Rent</SelectItem>
                                <SelectItem value="Scrab">Scrab</SelectItem>
                                <SelectItem value="Lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="rounded-none"
                            onClick={() =>
                              field.onChange(
                                field.value?.filter((v) => v.hardcase_code !== hardcase_code) ?? []
                              )
                            }
                          >
                            <MinusCircleIcon className="w-5 h-5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="block text-muted-foreground text-center w-full">No items</span>
                )}
              </FormItem>
            )}
          />
        </div>
        <Button disabled={isSubmitting || !isDirty} type="submit">
          {isSubmitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </form>
    </Form>
  );
}
