/* ************************************************************************
*
*  Zen [and the art of] CMS
*
*  https://zenesis.com
*
*  Copyright:
*    2019-2025 Zenesis Ltd, https://www.zenesis.com
*
*  License:
*    MIT (see LICENSE in project root)
*
*  Authors:
*    John Spackman (john.spackman@zenesis.com, @johnspackman)
*
* ************************************************************************ */

/**
 * Scans the database of tasks `zx.server.work.scheduler.ScheduledTask` for work to be done
 * and adds it to the QueueScheduler
 */
qx.Class.define("zx.server.work.scheduler.DbScanner", {
  extend: qx.core.Object,
  include: [zx.utils.mongo.MMongoClient],

  /**
   * Constructor; adds work to the QueueScheduler from the database
   *
   * @param {zx.server.work.scheduler.QueueScheduler} queueScheduler
   */
  construct(queueScheduler) {
    super();
    this.__queueScheduler = queueScheduler;

    /**
     * @type {qx.data.Array<String>} Array of UUIDs of zx.server.work.scheduler.ScheduledTask
     * which are waiting until their CRON expression is ready to run
     */
    this.__cronTasksOnHold = new qx.data.Array();

    /**
     * @type {Object<String, cron.CronJob>} Map of CRON task UUIDs to their cron jobs
     */
    this.__registeredCronTasks = {};

    /**
     * All tasks which have been queued on the scheduler and are waiting to be completed
     * Maps the work JSON UUID to the task JSON (zx.server.work.scheduler.ScheduledTask)
     */
    this.__runningTasks = {};
  },

  members: {
    /** @type{zx.server.work.scheduler.QueueScheduler} */
    __queueScheduler: null,

    __pollDatabasePromise: null,

    /**
     * Starts the scanner
     */
    async start() {
      this.__queueScheduler.addListener("noWork", this.triggerDatabaseCheck, this);
      this.__queueScheduler.addListener("workStarted", this.__onWorkStarted, this);
      this.__queueScheduler.addListener("workCompleted", this.__onWorkCompleted, this);
    },

    /**
     * Stops the scanner
     */
    async stop() {
      this.__queueScheduler.removeListener("noWork", this.triggerDatabaseCheck, this);
    },

    /**
     * Causes the database to be checked for more work (if enabled)
     */
    triggerDatabaseCheck() {
      if (this.__pollDatabasePromise) {
        return;
      }
      this.__pollDatabasePromise = this.__pollDatabase();
      this.__pollDatabasePromise.then(() => {
        this.__pollDatabasePromise = null;
      });
    },

    /**
     * Event handler for polling the database for more work
     */
    async __pollDatabase() {
      let cursor = await this.aggregate(zx.server.work.scheduler.ScheduledTask, [
        {
          $match: {
            enabled: true
          }
        }
      ]);

      while (await cursor.hasNext()) {
        let taskJson = await cursor.next();
        let workJson = taskJson.workJson;

        if (!workJson.uuid) {
          workJson.uuid = taskJson._uuid + "-work-task";
        }

        if (!workJson.title) {
          workJson.title = "Task: " + taskJson.title;
        }

        if (!workJson.description) {
          workJson.description = taskJson.description;
        }

        let taskIsRunning = Object.values(this.__runningTasks).find(task => task._uuid === taskJson._uuid);
        if (taskIsRunning) {
          this.debug(`Ignoring task ${taskJson._uuid} because it is still running.`);
          continue;
        }
        if (taskJson.earliestStartDate && taskJson.earliestStartDate.getTime() > new Date().getTime()) {
          this.debug(`Ignoring task ${taskJson._uuid} because it is not ready to run yet`);
          continue;
        }

        if (!qx.core.Environment.get("qx.debug")) {
          if (taskJson.failCount >= zx.server.work.scheduler.ScheduledTask.MAX_FAIL_COUNT) {
            this.debug(`Ignoring task ${taskJson._uuid} because it has failed too many times`);
            continue;
          }
        }

        if (taskJson.cronExpression) {
          if (!this.__registeredCronTasks[taskJson._uuid]) {
            this.debug("Found new CRON task: " + taskJson._uuid);
            const cron = require("cron");
            this.__registeredCronTasks[taskJson._uuid] = new cron.CronJob(
              taskJson.cronExpression,
              () => this.__cronTasksOnHold.remove(taskJson._uuid),
              null, // onComplete
              true
            );
          }

          if (!this.__cronTasksOnHold.includes(taskJson._uuid)) {
            this.debug(`Scheduling CRON task ${taskJson._uuid}`);
            this.__runningTasks[workJson.uuid] = taskJson;
            this.__cronTasksOnHold.push(taskJson._uuid);
            this.__queueScheduler.pushWork(workJson);
          } else {
            this.debug(`Ignoring CRON task ${taskJson._uuid} because it's too early to run it yet.`);
          }
        } else {
          //not cron
          this.__runningTasks[workJson.uuid] = taskJson;
          this.debug(`Found immediate task ${workJson.uuid} in database: ${taskJson.title}`);
          this.__queueScheduler.pushWork(workJson);
        }
      }
    },

    /**
     * Event handler for when the QueueScheduler starts executing a piece of IWork
     *
     * @param {*} evt
     */
    async __onWorkStarted(evt) {
      let workJson = evt.getData();
      let taskJson = this.__runningTasks[workJson.uuid];
      await this.updateOne(
        zx.server.work.scheduler.ScheduledTask,
        { _uuid: taskJson._uuid },
        {
          $set: {
            dateStarted: new Date()
          }
        }
      );
    },

    /**
     * Event handler for when the QueueScheduler finishes executing a piece of IWork
     *
     * @param {*} evt
     */
    async __onWorkCompleted(evt) {
      let workResultJson = evt.getData();
      let workUuid = workResultJson.workJson.uuid;
      let taskJson = this.__runningTasks[workUuid];

      if (!taskJson) {
        this.warn("should not call here! Scheduler reported task as finished which actually wasn't running.");
        debugger;
        return;
      }

      let update = {
        dateCompleted: new Date(),
        failCount: 0
      };

      if (workResultJson.response.exception) {
        debugger;
        update.failCount = (taskJson.failCount || 0) + 1;
        zx.server.email.AlertEmail.getInstance().alert(
          `A task has failed`,
          `Task with UUID ${taskJson._uuid} (${taskJson.title}) failed to run.
          Work JSON output:
          ${workResultJson.log}`
        );
      }

      if (!taskJson.cronExpression && !workResultJson.response.exception) {
        update.enabled = false;
      }
      delete this.__runningTasks[workUuid];

      this.debug(`Task ${taskJson._uuid} completed: ${taskJson.title}`);

      await this.updateOne(
        zx.server.work.scheduler.ScheduledTask,
        { _uuid: taskJson._uuid },
        {
          $set: update
        }
      );
    }
  }
});
