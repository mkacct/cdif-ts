// Evaluator: evaluates a main section AST (and optional component ASTs) returning a CDIFValue

import {CDIFReferenceError, CDIFTypeError} from "../../errors.js";
import {CDIFValue} from "../../general.js";
import {createPrimVal} from "../../primitive-value.js";
import CDIFStructure, {CDIFCollection, CDIFObject} from "../../structure.js";
import {ASTNodeID, ASTSpreadReference, ASTValue} from "./analyzer.js";

/**
 * @param node main section AST node
 * @param components map of component names to AST nodes
 * @param cdifVersion
 * @param componentRefs set of parent component names, for detecting circular references
 * @returns `CDIFValue` representing main section
 * @throws {CDIFSyntaxError} if a primitive value node's `cdifText` is not a valid cDIF primitive value
 * @throws {CDIFReferenceError} if a component reference node does not reference a defined component
 * @throws {CDIFTypeError} if a component is used in a spread expression where its type is not allowed
 */
export default function evaluateAstValue(
	node: ASTValue,
	components: ReadonlyMap<string, ASTValue>,
	cdifVersion: number,
	componentRefs: Set<string> = new Set<string>()
): CDIFValue {
	switch (node.id) {
		case ASTNodeID.LITERAL: {return createPrimVal(node.cdifText, cdifVersion);}
		case ASTNodeID.OBJECT: {
			const data: Map<string, CDIFValue> = new Map();
			for (const entry of node.contents) {
				if (entry.id === ASTNodeID.SPREAD_REFERENCE) {
					const spreadObject: CDIFObject = resolveSpread(entry,
						"object", ASTNodeID.OBJECT, (v): v is CDIFObject => v instanceof CDIFObject
					);
					for (const [key, value] of spreadObject.data) {
						data.set(key, value);
					}
				} else { // entry is ASTValue
					data.set(entry.key, evaluateAstValue(entry.value, components, cdifVersion, componentRefs));
				}
			}
			return new CDIFObject(data, node.typeName);
		}
		case ASTNodeID.COLLECTION: {
			const data: CDIFValue[] = [];
			for (const entry of node.contents) {
				if (entry.id === ASTNodeID.SPREAD_REFERENCE) {
					const spreadCollection: CDIFCollection = resolveSpread(entry,
						"collection", ASTNodeID.COLLECTION, (v): v is CDIFCollection => v instanceof CDIFCollection
					);
					for (const value of spreadCollection.data) {
						data.push(value);
					}
				} else { // entry is ASTValue
					data.push(evaluateAstValue(entry, components, cdifVersion, componentRefs));
				}
			}
			return new CDIFCollection(data, node.typeName);
		}
		case ASTNodeID.COMPONENT_REFERENCE: {return resolveComponent(node.componentName);}
	}

	function resolveComponent(componentName: string, validateRefNode?: (refNode: ASTValue) => void): CDIFValue {
		const refNode: ASTValue | undefined = components.get(componentName);
		if (!refNode) {throw new CDIFReferenceError(`Component "${componentName}" is not defined`);}
		if (validateRefNode) {validateRefNode(refNode);}
		if (componentRefs.has(componentName)) {
			throw new CDIFReferenceError(`Circular component reference detected (component: "${componentName}")`);
		}
		componentRefs.add(componentName);
		const value: CDIFValue = evaluateAstValue(refNode, components, cdifVersion, componentRefs);
		componentRefs.delete(componentName);
		return value;
	}

	function resolveSpread<V extends CDIFStructure>(
		entry: ASTSpreadReference,
		contextName: string,
		nodeId: ASTNodeID,
		isOfExpectedType: (value: CDIFValue) => value is V
	): V {
		const spreadStructure: CDIFValue = resolveComponent(entry.componentName, (refNode: ASTValue) => {
			if (refNode.id !== nodeId) {
				throw new CDIFTypeError(`Spread component in ${contextName} must also be ${contextName}`);
			}
		});
		if (!isOfExpectedType(spreadStructure)) {throw new TypeError(`Evaluator created wrong type of CDIFValue`);}
		return spreadStructure;
	}
}
