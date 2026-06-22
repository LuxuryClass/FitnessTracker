import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/Components/UI/Button/Button';
import { MuscleGroupBadge } from '@/Components/Common/MuscleGroupBadge/MuscleGroupBadge';
import { DefaultExerciseRow } from '@/Components/Common/DefaultExerciseRow/DefaultExerciseRow';
import MuscleAccentComponent from '@/Components/Common/MuscleAccentComponent/MuscleAccentComponent';
import ExerciseModal from '@/Components/Modals/ExerciseModal/ExerciseModal';
import { useExercisesQuery } from '@/hooks/useExercisesQuery';
import { useAuth } from '@/Auth';
import { labelForPrimary, labelForSecondary, PRIMARY_TO_SECONDARY } from '@/Utils/muscleGroups';
import styles from './Styles.module.scss';
import { ConfirmTemplateModal } from '@/Components/Modals/ConfirmTemplateModal/ConfirmTemplateModal';

interface TemplateExercise {
  exerciseId: string;
}

interface Template {
  id: string;
  title: string;
  description: string;
  muscleGroups: string[];
  primaryGroups?: string[];
  equipment: string[];
  exercises: TemplateExercise[];
}

const TemplateInfoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const hasExistingData = (location.state as any)?.hasData as boolean;
  const [showConfirm, setShowConfirm] = useState(false);

  const template = (location.state as any)?.template as Template | undefined;
  const { data: catalog = [], isPending: isCatalogPending } = useExercisesQuery();

  const [modalExercise, setModalExercise] = useState<any>(null);

  const catalogById = useMemo(() => {
    const map = new Map<string, (typeof catalog)[number]>();
    for (const ex of catalog) map.set(ex.id, ex);
    return map;
  }, [catalog]);

  const enrichedExercises = useMemo(() => {
    if (!template || isCatalogPending) return [];
    return template.exercises
      .map(te => {
        const info = catalogById.get(te.exerciseId);
        if (!info) return null;
        return {
          exerciseId: te.exerciseId,
          name: info.name,
          muscleGroups: info.primary_muscle_groups.map(labelForPrimary),
          targetMuscles: info.secondary_muscles.map(labelForSecondary),
          rawMuscleSlugs: info.primary_muscle_groups,
          rawTargetSlugs: info.secondary_muscles,
          equipment: info.equipment,
          imageUrl: info.media?.[0]?.url,
          media: info.media,
        };
      })
      .filter((ex): ex is NonNullable<typeof ex> => ex !== null);
  }, [template, isCatalogPending, catalogById]);

  const muscleFocusData = useMemo(() => {
    if (!enrichedExercises.length) return [];
    const counts = new Map<string, number>();
    for (const ex of enrichedExercises) {
      const secondary = new Set(ex.rawTargetSlugs);
      const slugs = new Set<string>();
      const claimed = new Set<string>();
      for (const g of ex.rawMuscleSlugs) {
        const groupSlugs = PRIMARY_TO_SECONDARY[g] ?? [];
        const groupSecondary = groupSlugs.filter((s) => secondary.has(s));
        if (groupSecondary.length > 0) {
          for (const s of groupSecondary) { slugs.add(s); claimed.add(s); }
        } else {
          for (const s of groupSlugs) slugs.add(s);
        }
      }
      for (const s of secondary) if (!claimed.has(s)) slugs.add(s);
      for (const slug of slugs) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return Array.from(counts, ([muscle, intensity]) => ({ muscle, intensity }));
  }, [enrichedExercises]);

  const equipment = useMemo(() => {
    const set = new Set<string>();
    for (const ex of enrichedExercises) {
      for (const eq of ex.equipment) set.add(eq);
    }
    return Array.from(set);
  }, [enrichedExercises]);

  const handleSelect = () => {
    if (!template) return;

    if (hasExistingData) {
      setShowConfirm(true);
    } else {
      applyTemplate();
    }
  };

  const applyTemplate = () => {
    if (!template) return;
    navigate('/add', {
      state: {
        templateData: {
          template,
          exercises: template.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
          })),
        },
      },
    });
  };

  const handleConfirmReplace = () => {
    setShowConfirm(false);
    applyTemplate();
  };

  if (!template) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Button size="back" onClick={() => navigate(-1)} />
          <h1 className={styles.title}>Шаблон не найден</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button size="back" onClick={() => navigate(-1)} />
        <h1 className={styles.title}>{template.title}</h1>
      </div>

      <div className={styles.content}>

        {template.description && (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Описание</h3>
            <p className={styles.description}>{template.description}</p>
        </div>
        )}

        {(template.muscleGroups.length > 0) && (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Группы мышц</h3>
            <MuscleGroupBadge
            groups={template.muscleGroups}
            primaryGroups={template.primaryGroups}
            type="block"
            />
        </div>
        )}

        {equipment.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Оборудование</h3>
            <MuscleGroupBadge groups={equipment} type="block" />
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Упражнения</h3>
          <div className={styles.exercisesList}>
            {enrichedExercises.map((exercise, index) => (
              <DefaultExerciseRow
                key={exercise.exerciseId}
                name={exercise.name}
                muscleGroups={exercise.muscleGroups}
                targetMuscles={exercise.targetMuscles}
                index={index}
                showDrag={false}
                showMuscleGroups={false}
                showImage={true}
                imageUrl={exercise.imageUrl}
                isDragging={false}
                isOver={false}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDragEnd={() => {}}
                onClick={() => setModalExercise(exercise)}
              />
            ))}
          </div>
        </div>

        {muscleFocusData.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Акцент на мышцы</h3>
            <MuscleAccentComponent
              gender={user?.gender ?? "male"}
              data={muscleFocusData}
            />
          </div>
        )}

      </div>

      {!modalExercise && (
        <Button
          size="l"
          color="primary"
          fullWidth
          onClick={handleSelect}
          className={styles.selectBtn}
        >
          Выбрать
        </Button>
      )}

      {showConfirm && (
        <ConfirmTemplateModal
          isOpen={showConfirm}
          onConfirm={handleConfirmReplace}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {modalExercise && (
        <ExerciseModal
          isOpen={!!modalExercise}
          onClose={() => setModalExercise(null)}
          name={modalExercise.name}
          muscleGroups={modalExercise.muscleGroups}
          targetMuscles={modalExercise.targetMuscles}
          equipment={modalExercise.equipment}
          media={modalExercise.media}
          description=""
          type="default"
          editable={false}
          showSettings={false}
        />
      )}
    </div>
  );
};

export default TemplateInfoPage;