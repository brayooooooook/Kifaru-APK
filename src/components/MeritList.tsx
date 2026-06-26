/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { calculateMeritList } from "../utils/assessmentEngine";
import type { Learner, AssessmentMarks } from "../types";


interface MeritListProps {
  learners: Learner[];
  marks: AssessmentMarks;
}


export default function MeritList({
  learners,
  marks
}: MeritListProps) {


  const rankedLearners = useMemo(() => {
    return calculateMeritList(
      learners,
      marks
    );
  }, [learners, marks]);


  return (
    <div className="space-y-4">

      <h2 className="text-xl font-bold">
        Class Merit List
      </h2>


      <div className="bg-white rounded-xl shadow border overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-slate-100">

            <tr>
              <th className="p-3 text-left">
                Position
              </th>

              <th className="p-3 text-left">
                Name
              </th>

              <th className="p-3 text-left">
                Total
              </th>

            </tr>

          </thead>


          <tbody>

            {rankedLearners.map(student => (

              <tr
                key={student.id}
                className="border-t"
              >

                <td className="p-3">
                  {student.position}
                </td>


                <td className="p-3">
                  {student.name}
                </td>


                <td className="p-3 font-semibold">
                  {student.total}
                </td>


              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}
