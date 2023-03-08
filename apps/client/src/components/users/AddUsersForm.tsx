import { getRoles } from "@/service/user.service";
import { clx } from "@/utils/classname.utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { endpoints } from "api-interface";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const createUserSchema = endpoints.user.createUser.bodySchema;
type ICreateUserData = z.infer<typeof createUserSchema>;

type Props = {
  roles: Awaited<ReturnType<typeof getRoles>>;
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  refetch: () => void;
};

const AddUsersForm = ({ setShow, show }: Props) => {
  const { handleSubmit } = useForm<ICreateUserData>({
    resolver: zodResolver(createUserSchema),
  });
  const handleCreateUser = (data: ICreateUserData) => {
    console.log(data);
  };
  return (
    <form
      className={clx(
        !show && "translate-x-full",
        "fixed top-0 right-0 bottom-0 z-20 w-80 bg-neutral p-2 transition-all"
      )}
      onSubmit={handleSubmit(handleCreateUser)}
    >
      <button
        type="reset"
        onClick={() => setShow((v) => !v)}
        className="btn btn-xs btn-circle"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
      <h1>Create New User</h1>
    </form>
  );
};

export default AddUsersForm;
