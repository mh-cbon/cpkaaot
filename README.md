# cpkaaot - child_process keep alive and other things

Keep alive a process, watch port activity to spawn/kill the child process, redirect stdout / stderr.

# install

```sh
npm i @mh-cbon/cpkaaot -g
```

# usage

```sh
cpkaaot [options] -- [command line]

Required options
  --retry           How many time should cpkaaot tries to respawn the process.
  --retrytimespan   Time span the process must not die more than
                    --retry times before it is considered as incorrect.

Optional options
  --stdout          Where to redirect child process stdout.
  --stderr          Where to redirect child process stderr.
  --watchaddress    Port to watch for activity to spawn the process.
  --watchinactvity  Inactive duration on the port after what the process is killed.
  --watchforward    Forward connect sockets to this address.
```

# Example

Keep alive a process, but stop to re spawn it if it dies more 3 times a minute.

`cpkaaot --retry 3 --retrytimespan 180000 -- [bin args]`

Redirect stdout to a file

`cpkaaot --retry 3 --retrytimespan 180000 --stdout /path/to/file -- [bin args]`

Watch activity on given port,
starts the process when socket connects,
stop the process after 3 minutes inactivity,
forward sockets to `localhost:8001`

`cpkaaot --retry 3 --retrytimespan 180000 --watchaddress 8000 --watchinactvity 180000 --watchforward 8001 -- [bin args]`
