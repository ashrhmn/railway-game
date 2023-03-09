import service from "@/service";
import { getRoles, getUsers } from "@/service/user.service";
import { clx } from "@/utils/classname.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { endpoints } from "api-interface";
import React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

const updateUserSchema = endpoints.user.updateUser.bodySchema;
type IUpdateUserData = z.infer<typeof updateUserSchema>;

type IUser = Exclude<Awaited<ReturnType<typeof getUsers>>, null>[number];

type Props = {
  roles: Awaited<ReturnType<typeof getRoles>>;
  user: IUser | null;
  setUser: React.Dispatch<React.SetStateAction<IUser | null>>;
  refetch: () => void;
};

const EditUsersForm = ({ setUser, roles, refetch, user }: Props) => {
  const {
    handleSubmit,
    register,
    control,
    formState: { errors },
  } = useForm<IUpdateUserData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user?.name || undefined,
      username: user?.username,
      password: undefined,
      roles: user?.roles.map((name, id) => ({ name, id })),
    },
  });
  const { append, remove } = useFieldArray({
    control,
    name: "roles",
  });
  const handleCreateUser = (data: IUpdateUserData) => {
    if (!user) return;
    promiseToast(
      service(endpoints.user.updateUser)({
        body: data,
        param: { id: user.id },
      }),
      {
        success: "User Created",
        loading: "Creating user...",
      }
    )
      .then(refetch)
      .then(() => setUser(null))
      .catch(handleReqError);
  };

  if (!roles) return <div>Error retrieving roles</div>;

  return (
    <form
      className={clx("p-2 transition-all")}
      onSubmit={handleSubmit(handleCreateUser)}
    >
      {!!user && (
        <>
          <h1>Update User</h1>
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
              key={user.id}
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
                  defaultChecked={user.roles.includes(role.name)}
                />
                <label>{role.name}</label>
              </div>
            ))}
          </div>
          <div className="modal-action">
            <button type="submit" className="btn btn-primary mt-4 w-full">
              Update User
            </button>
          </div>
        </>
      )}
    </form>
  );
};

export default EditUsersForm;
