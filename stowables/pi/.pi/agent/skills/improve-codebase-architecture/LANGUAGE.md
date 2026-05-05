# Language

Shared vocabulary for architecture suggestions. Use these terms exactly.

## Terms

**Module**
Anything with an interface and an implementation. Avoid: unit, component, service.

**Interface**
Everything a caller must know to use the module correctly: type signature, invariants, ordering constraints, error modes, configuration, and performance characteristics. Avoid: API, signature.

**Implementation**
What is inside a module: its body of code.

**Depth**
Leverage at the interface. A module is **deep** when a large amount of behavior sits behind a small interface. A module is **shallow** when the interface is nearly as complex as the implementation.

**Seam**
A place where behavior can be altered without editing in that place. Avoid: boundary.

**Adapter**
A concrete thing that satisfies an interface at a seam.

**Leverage**
What callers get from depth: more capability per unit of interface.

**Locality**
What maintainers get from depth: change, bugs, knowledge, and verification concentrate in one place.

## Principles

- Depth is a property of the interface, not the implementation.
- The deletion test: if deleting the module makes complexity vanish, it was a pass-through; if complexity reappears across callers, it was earning its keep.
- The interface is the test surface.
- One adapter means a hypothetical seam. Two adapters means a real seam.
