'use client'

import React, { useCallback } from 'react'
import { Icon } from '../icons'
import type { SkillsBlock, SkillInput } from '../../../../resume-test/types'
import { getSkillText, isSkillEnabled, createSkill } from '../../../../resume-test/types'
import styles from '../ResumeEditor.module.css'

interface SkillsEditorProps {
    block: SkillsBlock
    onUpdate: (data: SkillsBlock['data']) => void
}

export function SkillsEditor({ block, onUpdate }: SkillsEditorProps) {
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

    // Render skill chip
    const renderSkillChip = (
        skill: SkillInput,
        index: number,
        onToggle: () => void,
        onUpdate: (text: string) => void,
        onRemove: () => void
    ) => {
        const skillEnabled = isSkillEnabled(skill)
        const skillText = getSkillText(skill)

        return (
            <div
                key={index}
                className={`${styles.skillChip} ${!skillEnabled ? styles.skillChipDisabled : ''}`}
            >
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
                    onChange={(e) => onUpdate(e.target.value)}
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

    // Categorized format
    if (block.data.format === 'categorized') {
        return (
            <div className={styles.skillsContainer}>
                {(block.data.categories || []).map((category, catIndex) => {
                    const catEnabled = category.enabled !== false
                    return (
                        <div
                            key={catIndex}
                            className={`${styles.skillCategory} ${!catEnabled ? styles.entryCardDisabled : ''}`}
                        >
                            <div className={styles.skillCategoryHeader}>
                                <button
                                    type="button"
                                    className={`${styles.entryVisibility} ${!catEnabled ? styles.entryVisibilityOff : ''}`}
                                    onClick={() => toggleCategory(catIndex)}
                                    aria-label={catEnabled ? 'Hide category' : 'Show category'}
                                >
                                    <Icon name={catEnabled ? 'eye' : 'eye-off'} size={14} />
                                </button>
                                <input
                                    type="text"
                                    className={styles.skillCategoryName}
                                    value={category.name}
                                    onChange={(e) => updateCategoryName(catIndex, e.target.value)}
                                    placeholder="Category Name (e.g., Frontend, Backend)"
                                />
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnDanger}`}
                                    onClick={() => removeCategory(catIndex)}
                                    aria-label="Remove category"
                                >
                                    <Icon name="trash" size={14} />
                                </button>
                            </div>

                            {catEnabled && (
                                <div className={styles.skillsList}>
                                    {category.skills.map((skill, skillIndex) =>
                                        renderSkillChip(
                                            skill,
                                            skillIndex,
                                            () => toggleSkillInCategory(catIndex, skillIndex),
                                            (text) => updateSkillInCategory(catIndex, skillIndex, text),
                                            () => removeSkillFromCategory(catIndex, skillIndex)
                                        )
                                    )}
                                    <button
                                        type="button"
                                        className={`${styles.btn} ${styles.btnSecondary}`}
                                        onClick={() => addSkillToCategory(catIndex)}
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    >
                                        <Icon name="plus" size={12} /> Add
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}

                <button type="button" className={styles.btnAdd} onClick={addCategory}>
                    <Icon name="plus" size={16} /> Add Category
                </button>
            </div>
        )
    }

    // Inline/list format
    return (
        <div className={styles.skillsContainer}>
            <div className={styles.skillsList}>
                {(block.data.skills || []).map((skill, skillIndex) =>
                    renderSkillChip(
                        skill,
                        skillIndex,
                        () => toggleSkill(skillIndex),
                        (text) => updateSkill(skillIndex, text),
                        () => removeSkill(skillIndex)
                    )
                )}
            </div>
            <button type="button" className={styles.btnAdd} onClick={addSkill}>
                <Icon name="plus" size={16} /> Add Skill
            </button>
        </div>
    )
}
