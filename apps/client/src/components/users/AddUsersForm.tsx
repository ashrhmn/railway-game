import service from "@/service";
import { getRoles } from "@/service/user.service";
import { clx } from "@/utils/classname.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { endpoints } from "api-interface";
import React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

const createUserSchema = endpoints.user.createUser.bodySchema;
type ICreateUserData = z.infer<typeof createUserSchema>;

type Props = {
  roles: Awaited<ReturnType<typeof getRoles>>;
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  refetch: () => void;
};

const AddUsersForm = ({ setShow, show, roles, refetch }: Props) => {
  const {
    handleSubmit,
    register,
    control,
    formState: { errors },
  } = useForm<ICreateUserData>({
    resolver: zodResolver(createUserSchema),
  });
  const { append, remove } = useFieldArray({
    control,
    name: "roles",
  });
  const handleCreateUser = (data: ICreateUserData) => {
    promiseToast(service(endpoints.user.createUser)({ body: data }), {
      success: "User Created",
      loading: "Creating user...",
    })
      .then(refetch)
      .then(() => setShow(false))
      .catch(handleReqError);
  };

  if (!roles) return <div>Error retrieving roles</div>;

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
      <div className="form-control mt-4">
        <label className="label">
          <span className="label-text">Name</span>
        </label>
        <input
          type="text"
          className="input-bordered input"
          {...register("name")}
        />
        <p className="text-error">{errors.name?.message}</p>
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Username</span>
        </label>
        <input
          type="text"
          className="input-bordered input"
          {...register("username")}
        />
        <p className="text-error">{errors.username?.message}</p>
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Password</span>
        </label>
        <input
          type="text"
          className="input-bordered input"
          {...register("password")}
        />
        <p className="text-error">{errors.password?.message}</p>
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Roles</span>
        </label>
        {roles.map((role) => (
          <div className="my-1 flex gap-5 px-1" key={role.id}>
            <input
              className="checkbox"
              type="checkbox"
              onChange={(e) =>
                e.target.checked
                  ? append({ id: role.id, name: role.name })
                  : remove(role.id)
              }
              defaultChecked={false}
            />
            <label>{role.name}</label>
          </div>
        ))}
      </div>
      <button type="submit" className="btn btn-primary mt-4 w-full">
        Create User
      </button>
    </form>
  );
};

export default AddUsersForm;
