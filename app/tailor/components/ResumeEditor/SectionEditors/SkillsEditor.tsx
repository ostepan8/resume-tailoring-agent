'use client'

import React, { useCallback, useId } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../icons'
import type { SkillsBlock, SkillInput, SkillCategory } from '../../../../resume-test/types'
import { getSkillText, isSkillEnabled, createSkill } from '../../../../resume-test/types'
import styles from '../ResumeEditor.module.css'

// Sortable Skill Chip Component
interface SortableSkillChipProps {
    id: string
    skill: SkillInput
    onToggle: () => void
    onUpdateText: (text: string) => void
    onRemove: () => void
}

function SortableSkillChip({ id, skill, onToggle, onUpdateText, onRemove }: SortableSkillChipProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const skillEnabled = isSkillEnabled(skill)
    const skillText = getSkillText(skill)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 50 : 'auto',
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.skillChip} ${!skillEnabled ? styles.skillChipDisabled : ''} ${isDragging ? styles.dragging : ''}`}
        >
            <button
                type="button"
                className={styles.dragHandle}
                style={{ width: 16, height: 16, marginRight: 2 }}
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder skill"
            >
                <Icon name="grip-vertical" size={10} />
            </button>
            <button
                type="button"
                className={`${styles.skillChipVisibility} ${!skillEnabled ? styles.skillChipVisibilityOff : ''}`}
                onClick={onToggle}
                aria-label={skillEnabled ? 'Hide skill' : 'Show skill'}
            >
                <Icon name={skillEnabled ? 'eye' : 'eye-off'} size={12} />
            </button>
            <input
                type="text"
                className={styles.skillChipInput}
                value={skillText}
                onChange={(e) => onUpdateText(e.target.value)}
                placeholder="Skill..."
                disabled={!skillEnabled}
            />
            <button
                type="button"
                className={styles.skillChipRemove}
                onClick={onRemove}
                aria-label="Remove skill"
            >
                ×
            </button>
        </div>
    )
}

// Sortable Category Component
interface SortableCategoryProps {
    id: string
    category: SkillCategory
    catIndex: number
    catEnabled: boolean
    skillDndId: string
    onToggleCategory: () => void
    onUpdateCategoryName: (name: string) => void
    onRemoveCategory: () => void
    onSkillDragEnd: (event: DragEndEvent, catIndex: number) => void
    onToggleSkill: (skillIndex: number) => void
    onUpdateSkill: (skillIndex: number, text: string) => void
    onRemoveSkill: (skillIndex: number) => void
    onAddSkill: () => void
    sensors: ReturnType<typeof useSensors>
}

function SortableCategory({
    id,
    category,
    catIndex,
    catEnabled,
    skillDndId,
    onToggleCategory,
    onUpdateCategoryName,
    onRemoveCategory,
    onSkillDragEnd,
    onToggleSkill,
    onUpdateSkill,
    onRemoveSkill,
    onAddSkill,
    sensors,
}: SortableCategoryProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 50 : 'auto',
    }

    const skillIds = category.skills.map((_, i) => `${id}-skill-${i}`)

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.skillCategory} ${!catEnabled ? styles.entryCardDisabled : ''} ${isDragging ? styles.dragging : ''}`}
        >
            <div className={styles.skillCategoryHeader}>
                <button
                    type="button"
                    className={styles.dragHandle}
                    {...attributes}
                    {...listeners}
                    aria-label="Drag to reorder category"
                >
                    <Icon name="grip-vertical" size={16} />
                </button>
                <button
                    type="button"
                    className={`${styles.entryVisibility} ${!catEnabled ? styles.entryVisibilityOff : ''}`}
                    onClick={onToggleCategory}
                    aria-label={catEnabled ? 'Hide category' : 'Show category'}
                >
                    <Icon name={catEnabled ? 'eye' : 'eye-off'} size={14} />
                </button>
                <input
                    type="text"
                    className={styles.skillCategoryName}
                    value={category.name}
                    onChange={(e) => onUpdateCategoryName(e.target.value)}
                    placeholder="Category Name (e.g., Frontend, Backend)"
                />
                <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnDanger}`}
                    onClick={onRemoveCategory}
                    aria-label="Remove category"
                >
                    <Icon name="trash" size={14} />
                </button>
            </div>

            {catEnabled && (
                <DndContext
                    id={skillDndId}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => onSkillDragEnd(e, catIndex)}
                >
                    <SortableContext items={skillIds} strategy={horizontalListSortingStrategy}>
                        <div className={styles.skillsList}>
                            {category.skills.map((skill, skillIndex) => (
                                <SortableSkillChip
                                    key={skillIds[skillIndex]}
                                    id={skillIds[skillIndex]}
                                    skill={skill}
                                    onToggle={() => onToggleSkill(skillIndex)}
                                    onUpdateText={(text) => onUpdateSkill(skillIndex, text)}
                                    onRemove={() => onRemoveSkill(skillIndex)}
                                />
                            ))}
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnSecondary}`}
                                onClick={onAddSkill}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            >
                                <Icon name="plus" size={12} /> Add
                            </button>
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    )
}

interface SkillsEditorProps {
    block: SkillsBlock
    onUpdate: (data: SkillsBlock['data']) => void
}

export function SkillsEditor({ block, onUpdate }: SkillsEditorProps) {
    const categoryDndId = useId()
    const inlineSkillsDndId = useId()

    // DnD sensors - use small activation distance for responsive dragging
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Category reorder handler
    const handleCategoryDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const categories = block.data.categories || []
        const prefix = `category-${block.id}-`
        const oldIndex = categories.findIndex((_, i) => `${prefix}${i}` === active.id)
        const newIndex = categories.findIndex((_, i) => `${prefix}${i}` === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
            const reordered = arrayMove(categories, oldIndex, newIndex)
            onUpdate({ ...block.data, categories: reordered })
        }
    }, [block.data, block.id, onUpdate])

    // Skill reorder within category handler
    const handleSkillDragEnd = useCallback((event: DragEndEvent, catIndex: number) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const categories = [...(block.data.categories || [])]
            const skills = [...categories[catIndex].skills]
            // Skill IDs format: category-{blockId}-{catIndex}-skill-{skillIndex}
            const activeIdParts = (active.id as string).split('-skill-')
            const overIdParts = (over.id as string).split('-skill-')
            const oldIndex = activeIdParts.length > 1 ? parseInt(activeIdParts[1], 10) : -1
            const newIndex = overIdParts.length > 1 ? parseInt(overIdParts[1], 10) : -1
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex < skills.length && newIndex < skills.length) {
                categories[catIndex] = {
                    ...categories[catIndex],
                    skills: arrayMove(skills, oldIndex, newIndex),
                }
                onUpdate({ ...block.data, categories })
            }
        }
    }, [block.data, onUpdate])

    // Inline skills reorder handler
    const handleInlineSkillDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const skills = block.data.skills || []
            const prefix = `skill-${block.id}-`
            const oldIndex = skills.findIndex((_, i) => `${prefix}${i}` === active.id)
            const newIndex = skills.findIndex((_, i) => `${prefix}${i}` === over.id)

            if (oldIndex !== -1 && newIndex !== -1) {
                onUpdate({ ...block.data, skills: arrayMove(skills, oldIndex, newIndex) })
            }
        }
    }, [block.data, block.id, onUpdate])

    // Category functions
    const updateCategoryName = useCallback((catIndex: number, name: string) => {
        const categories = [...(block.data.categories || [])]
        categories[catIndex] = { ...categories[catIndex], name }
        onUpdate({ ...block.data, categories })
    }, [block.data, onUpdate])

    const toggleCategory = useCallback((catIndex: number) => {
        const categories = [...(block.data.categories || [])]
        const currentEnabled = categories[catIndex].enabled !== false
        categories[catIndex] = { ...categories[catIndex], enabled: !currentEnabled }
        onUpdate({ ...block.data, categories })
    }, [block.data, onUpdate])

    const addCategory = useCallback(() => {
        const categories = block.data.categories || []
        onUpdate({
            ...block.data,
            categories: [...categories, { name: '', enabled: true, skills: [] }],
        })
    }, [block.data, onUpdate])

    const removeCategory = useCallback((catIndex: number) => {
        const categories = block.data.categories || []
        onUpdate({
            ...block.data,
            categories: categories.filter((_, i) => i !== catIndex),
        })
    }, [block.data, onUpdate])

    // Skill functions for categorized format
    const toggleSkillInCategory = useCallback((catIndex: number, skillIndex: number) => {
        const categories = [...(block.data.categories || [])]
        const skills = [...categories[catIndex].skills]
        const skill = skills[skillIndex]
        const text = getSkillText(skill)
        const wasEnabled = isSkillEnabled(skill)
        skills[skillIndex] = createSkill(text, !wasEnabled)
        categories[catIndex] = { ...categories[catIndex], skills }
        onUpdate({ ...block.data, categories })
    }, [block.data, onUpdate])

    const updateSkillInCategory = useCallback((catIndex: number, skillIndex: number, text: string) => {
        const categories = [...(block.data.categories || [])]
        const skills = [...categories[catIndex].skills]
        const skill = skills[skillIndex]
        const wasEnabled = isSkillEnabled(skill)
        skills[skillIndex] = createSkill(text, wasEnabled)
        categories[catIndex] = { ...categories[catIndex], skills }
        onUpdate({ ...block.data, categories })
    }, [block.data, onUpdate])

    const addSkillToCategory = useCallback((catIndex: number) => {
        const categories = [...(block.data.categories || [])]
        categories[catIndex] = {
            ...categories[catIndex],
            skills: [...categories[catIndex].skills, createSkill('')],
        }
        onUpdate({ ...block.data, categories })
    }, [block.data, onUpdate])

    const removeSkillFromCategory = useCallback((catIndex: number, skillIndex: number) => {
        const categories = [...(block.data.categories || [])]
        categories[catIndex] = {
            ...categories[catIndex],
            skills: categories[catIndex].skills.filter((_, i) => i !== skillIndex),
        }
        onUpdate({ ...block.data, categories })
    }, [block.data, onUpdate])

    // Skill functions for inline/list format
    const toggleSkill = useCallback((skillIndex: number) => {
        const skills = [...(block.data.skills || [])]
        const skill = skills[skillIndex]
        const text = getSkillText(skill)
        const wasEnabled = isSkillEnabled(skill)
        skills[skillIndex] = createSkill(text, !wasEnabled)
        onUpdate({ ...block.data, skills })
    }, [block.data, onUpdate])

    const updateSkill = useCallback((skillIndex: number, text: string) => {
        const skills = [...(block.data.skills || [])]
        const skill = skills[skillIndex]
        const wasEnabled = isSkillEnabled(skill)
        skills[skillIndex] = createSkill(text, wasEnabled)
        onUpdate({ ...block.data, skills })
    }, [block.data, onUpdate])

    const addSkill = useCallback(() => {
        const skills = block.data.skills || []
        onUpdate({ ...block.data, skills: [...skills, createSkill('')] })
    }, [block.data, onUpdate])

    const removeSkill = useCallback((skillIndex: number) => {
        const skills = block.data.skills || []
        onUpdate({ ...block.data, skills: skills.filter((_, i) => i !== skillIndex) })
    }, [block.data, onUpdate])

    const categories = block.data.categories || []
    const categoryIds = categories.map((_, i) => `category-${block.id}-${i}`)

    // Categorized format
    if (block.data.format === 'categorized') {
        return (
            <div className={styles.skillsContainer} data-nested-dnd="true">
                <DndContext
                    id={categoryDndId}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleCategoryDragEnd}
                >
                    <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                        {categories.map((category, catIndex) => {
                            const catEnabled = category.enabled !== false
                            return (
                                <SortableCategory
                                    key={categoryIds[catIndex]}
                                    id={categoryIds[catIndex]}
                                    category={category}
                                    catIndex={catIndex}
                                    catEnabled={catEnabled}
                                    skillDndId={`${categoryDndId}-cat-${catIndex}-skills`}
                                    onToggleCategory={() => toggleCategory(catIndex)}
                                    onUpdateCategoryName={(name) => updateCategoryName(catIndex, name)}
                                    onRemoveCategory={() => removeCategory(catIndex)}
                                    onSkillDragEnd={handleSkillDragEnd}
                                    onToggleSkill={(skillIndex) => toggleSkillInCategory(catIndex, skillIndex)}
                                    onUpdateSkill={(skillIndex, text) => updateSkillInCategory(catIndex, skillIndex, text)}
                                    onRemoveSkill={(skillIndex) => removeSkillFromCategory(catIndex, skillIndex)}
                                    onAddSkill={() => addSkillToCategory(catIndex)}
                                    sensors={sensors}
                                />
                            )
                        })}
                    </SortableContext>
                </DndContext>

                <button type="button" className={styles.btnAdd} onClick={addCategory}>
                    <Icon name="plus" size={16} /> Add Category
                </button>
            </div>
        )
    }

    // Inline/list format
    const skills = block.data.skills || []
    const skillIds = skills.map((_, i) => `skill-${block.id}-${i}`)

    return (
        <div className={styles.skillsContainer} data-nested-dnd="true">
            <DndContext
                id={inlineSkillsDndId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleInlineSkillDragEnd}
            >
                <SortableContext items={skillIds} strategy={horizontalListSortingStrategy}>
                    <div className={styles.skillsList}>
                        {skills.map((skill, skillIndex) => (
                            <SortableSkillChip
                                key={skillIds[skillIndex]}
                                id={skillIds[skillIndex]}
                                skill={skill}
                                onToggle={() => toggleSkill(skillIndex)}
                                onUpdateText={(text) => updateSkill(skillIndex, text)}
                                onRemove={() => removeSkill(skillIndex)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            <button type="button" className={styles.btnAdd} onClick={addSkill}>
                <Icon name="plus" size={16} /> Add Skill
            </button>
        </div>
    )
}
